-- One SELECT policy instead of two, and auth.jwt() evaluated once per query (advisor fixes).
drop policy "members manage invites" on public.household_invites;
drop policy "invitee sees own invite" on public.household_invites;

create policy "members and invitee read invites" on public.household_invites
  for select to authenticated
  using (household_id = (select private.my_household()) or email = (select lower(auth.jwt() ->> 'email')));

create policy "members create invites" on public.household_invites
  for insert to authenticated
  with check (household_id = (select private.my_household()) and invited_by = (select auth.uid()));

create policy "members delete invites" on public.household_invites
  for delete to authenticated
  using (household_id = (select private.my_household()));
