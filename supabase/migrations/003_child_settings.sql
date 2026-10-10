-- Shared settings: the child's birth month (age-aware advice) and how far to look for activity places.
alter table public.households
  add column child_birth date check (child_birth between date '2005-01-01' and date '2100-01-01'),
  add column places_radius_km real not null default 3 check (places_radius_km between 0.5 and 5);

grant update (name, child_birth, places_radius_km) on public.households to authenticated;
