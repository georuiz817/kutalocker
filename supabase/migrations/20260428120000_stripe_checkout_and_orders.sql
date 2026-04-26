-- Order metadata for Stripe + shipping; cart is carried in Checkout Session metadata
alter table public.orders
  add column if not exists shipping_address jsonb,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists platform_fee numeric(10, 2) not null default 0 check (platform_fee >= 0);

create unique index if not exists orders_stripe_checkout_session_id_key
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Sellers: read orders for their lockers
create policy "Sellers can read orders for their lockers"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.lockers
    where lockers.id = orders.locker_id
      and lockers.seller_id = auth.uid()
  )
);

-- Sellers: read order lines for their lockers' orders
create policy "Sellers can read order items for their orders"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    join public.lockers on lockers.id = orders.locker_id
    where orders.id = order_items.order_id
      and lockers.seller_id = auth.uid()
  )
);

-- Return only buyer email to sellers (never other users columns like future payout fields)
create or replace function public.seller_order_buyer_email(p_order_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.orders o
  join public.lockers l on l.id = o.locker_id
  join public.users u on u.id = o.buyer_id
  where o.id = p_order_id
    and l.seller_id = auth.uid();
$$;

revoke all on function public.seller_order_buyer_email(uuid) from public;
grant execute on function public.seller_order_buyer_email(uuid) to authenticated;

notify pgrst, 'reload schema';
