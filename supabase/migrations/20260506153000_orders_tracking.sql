-- Tracking for shipped orders (sellers set; buyers read)
alter table public.orders
  add column if not exists tracking_number text;

alter table public.orders
  add column if not exists carrier text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_carrier_valid'
  ) then
    alter table public.orders
      add constraint orders_carrier_valid
      check (
        carrier is null or carrier in ('USPS', 'UPS', 'FedEx', 'Other')
      );
  end if;
end $$;

notify pgrst, 'reload schema';
