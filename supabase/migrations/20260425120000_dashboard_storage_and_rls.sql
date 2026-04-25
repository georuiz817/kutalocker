-- Optional item name (was NOT NULL in initial migration)
alter table public.items
  alter column name drop not null;

-- Sellers must be able to read their own lockers in any state (for dashboard / edit)
create policy "Sellers can read their own lockers"
on public.lockers
for select
to authenticated
using (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'seller'
  )
);

-- Sellers must read items for non-active lockers they own
create policy "Sellers can read items in own lockers"
on public.items
for select
to authenticated
using (
  exists (
    select 1
    from public.lockers
    where lockers.id = items.locker_id
      and lockers.seller_id = auth.uid()
  )
);

-- Replace locker update policy: cannot change rows that are already frozen
drop policy if exists "Sellers can update their own lockers" on public.lockers;

create policy "Sellers can update their own unfrozen lockers"
on public.lockers
for update
to authenticated
using (
  seller_id = auth.uid()
  and state <> 'frozen'::public.locker_state
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'seller'
  )
)
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'seller'
  )
);

-- Items on frozen lockers cannot be mutated
drop policy if exists "Sellers can create items in their own lockers" on public.items;
drop policy if exists "Sellers can update items in their own lockers" on public.items;
drop policy if exists "Sellers can delete items in their own lockers" on public.items;

create policy "Sellers can create items in their active lockers"
on public.items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.lockers
    join public.users on users.id = lockers.seller_id
    where lockers.id = items.locker_id
      and lockers.seller_id = auth.uid()
      and lockers.state = 'active'::public.locker_state
      and users.role = 'seller'
  )
);

create policy "Sellers can update items in their active lockers"
on public.items
for update
to authenticated
using (
  exists (
    select 1
    from public.lockers
    join public.users on users.id = lockers.seller_id
    where lockers.id = items.locker_id
      and lockers.seller_id = auth.uid()
      and lockers.state = 'active'::public.locker_state
      and users.role = 'seller'
  )
)
with check (
  exists (
    select 1
    from public.lockers
    join public.users on users.id = lockers.seller_id
    where lockers.id = items.locker_id
      and lockers.seller_id = auth.uid()
      and lockers.state = 'active'::public.locker_state
      and users.role = 'seller'
  )
);

create policy "Sellers can delete items in their active lockers"
on public.items
for delete
to authenticated
using (
  exists (
    select 1
    from public.lockers
    join public.users on users.id = lockers.seller_id
    where lockers.id = items.locker_id
      and lockers.seller_id = auth.uid()
      and lockers.state = 'active'::public.locker_state
      and users.role = 'seller'
  )
);

-- Public bucket for locker photos (object key must start with "{auth.uid()}/")
insert into storage.buckets (id, name, public)
values ('locker-photos', 'locker-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Locker photos are publicly readable" on storage.objects;
drop policy if exists "Sellers can upload locker photos to their folder" on storage.objects;
drop policy if exists "Sellers can update their locker photos" on storage.objects;
drop policy if exists "Sellers can delete their locker photos" on storage.objects;

create policy "Locker photos are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'locker-photos');

create policy "Sellers can upload locker photos to their folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'locker-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Sellers can update their locker photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'locker-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'locker-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Sellers can delete their locker photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'locker-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

notify pgrst, 'reload schema';
