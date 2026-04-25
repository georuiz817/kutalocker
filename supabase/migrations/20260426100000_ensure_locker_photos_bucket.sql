-- Fixes "Bucket not found" when uploading locker photos if the bucket was never created.
-- Safe to run more than once.

insert into storage.buckets (id, name, public)
select 'locker-photos', 'locker-photos', true
where not exists (select 1 from storage.buckets where id = 'locker-photos');

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
