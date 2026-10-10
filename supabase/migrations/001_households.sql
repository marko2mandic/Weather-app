-- Shared "household" so both parents train one comfort model.
-- Access model: a user belongs to at most one household; everything is scoped to it by RLS.
-- Writes that need cross-row logic (create, join, apply feedback) go through
-- SECURITY DEFINER functions that check auth.uid() themselves.

create schema if not exists private;

-- ---------- tables ----------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our family' check (char_length(name) between 1 and 60),
  -- °C; positive = the child needs warmer clothes than the standard guide
  warmth_offset real not null default 0 check (warmth_offset between -5 and 5),
  -- multiplier on the sand drying model
  sand_factor real not null default 1 check (sand_factor between 0.3 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- one household per user; also serves the per-user lookups in policies
create unique index household_members_user_id_key on public.household_members (user_id);

create table public.household_invites (
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (household_id, email)
);
create index household_invites_email_idx on public.household_invites (email);
create index household_invites_invited_by_idx on public.household_invites (invited_by);

create table public.feedback (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  kind text not null check (kind in ('dress', 'sand', 'tip')),
  value text not null check (char_length(value) <= 40),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index feedback_household_created_idx on public.feedback (household_id, created_at desc);
create index feedback_user_id_idx on public.feedback (user_id);

-- ---------- helpers ----------

-- Household of the calling user (null if none). SECURITY DEFINER avoids RLS recursion on household_members.
create or replace function private.my_household()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;

-- Policies evaluate with the caller's privileges, so authenticated needs EXECUTE.
-- The private schema is not exposed through the API, so it can't be called directly from clients.
revoke all on function private.my_household() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.my_household() to authenticated;

-- ---------- RLS ----------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.feedback enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (id = (select private.my_household()));
create policy "members rename their household" on public.households
  for update to authenticated using (id = (select private.my_household())) with check (id = (select private.my_household()));

create policy "members see each other" on public.household_members
  for select to authenticated using (household_id = (select private.my_household()));
create policy "members can leave" on public.household_members
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "members manage invites" on public.household_invites
  for all to authenticated
  using (household_id = (select private.my_household()))
  with check (household_id = (select private.my_household()) and invited_by = (select auth.uid()));
create policy "invitee sees own invite" on public.household_invites
  for select to authenticated using (email = lower((select auth.jwt() ->> 'email')));

create policy "members read feedback" on public.feedback
  for select to authenticated using (household_id = (select private.my_household()));
-- inserts go through apply_feedback() so the tuning update and the log stay in sync

-- Only the columns clients may touch directly
revoke all on public.households, public.household_members, public.household_invites, public.feedback from anon;
revoke insert, update, delete on public.households from authenticated;
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;
revoke insert, update on public.household_members from authenticated;
grant select, delete on public.household_members to authenticated;
grant select, insert, delete on public.household_invites to authenticated;
revoke insert, update, delete on public.feedback from authenticated;
grant select on public.feedback to authenticated;

-- ---------- RPCs ----------

-- First parent: create the household, seeded with whatever tuning the device learned offline.
create or replace function public.create_household(p_name text default 'Our family', p_warmth real default 0, p_sand real default 1)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h public.households;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already in a household';
  end if;
  insert into public.households (name, warmth_offset, sand_factor)
  values (coalesce(nullif(trim(p_name), ''), 'Our family'), greatest(-5, least(5, p_warmth)), greatest(0.3, least(3, p_sand)))
  returning * into h;
  insert into public.household_members (household_id, user_id, email)
  values (h.id, uid, lower(coalesce((select auth.jwt() ->> 'email'), '')));
  return h;
end;
$$;

-- Second parent: join the household that invited this email (no-op if none).
create or replace function public.claim_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  em text := lower((select auth.jwt() ->> 'email'));
  hid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select household_id into hid from public.household_members where user_id = uid;
  if hid is not null then return hid; end if;

  select household_id into hid from public.household_invites where email = em order by created_at limit 1;
  if hid is null then return null; end if;

  insert into public.household_members (household_id, user_id, email) values (hid, uid, em);
  delete from public.household_invites where email = em;
  return hid;
end;
$$;

-- Log feedback and update the shared tuning atomically (both parents may tap at once).
create or replace function public.apply_feedback(p_kind text, p_value text, p_context jsonb default '{}'::jsonb)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  h public.households;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select household_id into hid from public.household_members where user_id = uid;
  if hid is null then raise exception 'no household'; end if;

  insert into public.feedback (household_id, user_id, kind, value, context)
  values (hid, uid, p_kind, p_value, coalesce(p_context, '{}'::jsonb));

  -- same rules as src/lib/learning.ts
  update public.households set
    warmth_offset = case
      when p_kind = 'dress' and p_value = 'too-cold' then least(5, warmth_offset + 1)
      when p_kind = 'dress' and p_value = 'too-warm' then greatest(-5, warmth_offset - 1)
      else warmth_offset end,
    sand_factor = case
      when p_kind = 'sand' and p_value = 'wetter' then greatest(0.3, sand_factor * 0.8)
      when p_kind = 'sand' and p_value = 'drier' then least(3, sand_factor * 1.25)
      else sand_factor end,
    updated_at = now()
  where id = hid
  returning * into h;
  return h;
end;
$$;

revoke all on function public.create_household(text, real, real) from public, anon;
revoke all on function public.claim_invite() from public, anon;
revoke all on function public.apply_feedback(text, text, jsonb) from public, anon;
grant execute on function public.create_household(text, real, real) to authenticated;
grant execute on function public.claim_invite() to authenticated;
grant execute on function public.apply_feedback(text, text, jsonb) to authenticated;

-- Live updates when the other parent gives feedback
alter publication supabase_realtime add table public.households, public.feedback;
