-- Order lifecycle for seller tooling (paid vs future states).
alter table public.orders
  add column if not exists status text not null default 'completed'
    check (status in ('pending', 'completed', 'cancelled'));

comment on column public.orders.status is
  'completed = paid checkout recorded; awaiting tracking when tracking_number is null';

notify pgrst, 'reload schema';
