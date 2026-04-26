-- Let buyers read locker metadata for order history when the locker is no longer "active"
create policy "Buyers can read lockers for their orders"
on public.lockers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.locker_id = lockers.id
      and orders.buyer_id = auth.uid()
  )
);

-- Let buyers read sold line items for order history
create policy "Buyers can read items in their own orders"
on public.items
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.item_id = items.id
      and orders.buyer_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
