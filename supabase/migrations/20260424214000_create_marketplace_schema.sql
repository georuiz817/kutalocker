create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('buyer', 'seller');
  end if;

  if not exists (select 1 from pg_type where typname = 'locker_state') then
    create type public.locker_state as enum ('active', 'frozen', 'sold_out');
  end if;
end
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now()
);

create table public.lockers (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique not null,
  nickname text not null,
  photo_url text,
  shipping_rate numeric(10, 2) not null default 0 check (shipping_rate >= 0),
  state public.locker_state not null default 'active',
  seller_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references public.lockers(id) on delete cascade,
  number integer not null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  sold boolean not null default false,
  created_at timestamptz not null default now(),
  unique (locker_id, number)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete cascade,
  locker_id uuid not null references public.lockers(id) on delete restrict,
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  unique (order_id, item_id)
);

create index lockers_seller_id_idx on public.lockers(seller_id);
create index lockers_state_idx on public.lockers(state);
create index items_locker_id_idx on public.items(locker_id);
create index orders_buyer_id_idx on public.orders(buyer_id);
create index orders_locker_id_idx on public.orders(locker_id);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_item_id_idx on public.order_items(item_id);

create or replace function public.prevent_locker_number_update()
returns trigger
language plpgsql
as $$
begin
  if new.number is distinct from old.number then
    raise exception 'locker number is permanent and cannot be changed';
  end if;

  return new;
end;
$$;

create trigger prevent_locker_number_update
before update of number on public.lockers
for each row execute function public.prevent_locker_number_update();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.raw_user_meta_data->>'role' in ('buyer', 'seller')
        then (new.raw_user_meta_data->>'role')::public.user_role
      else 'buyer'::public.user_role
    end
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.lockers enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.lockers, public.items to anon, authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.lockers, public.items to authenticated;
grant select, insert on public.orders, public.order_items to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Users can read their own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "Users can create their own profile"
on public.users
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own email"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Anyone can read active lockers"
on public.lockers
for select
to anon, authenticated
using (state = 'active');

create policy "Sellers can create their own lockers"
on public.lockers
for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'seller'
  )
);

create policy "Sellers can update their own lockers"
on public.lockers
for update
to authenticated
using (
  seller_id = auth.uid()
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

create policy "Sellers can delete their own lockers"
on public.lockers
for delete
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

create policy "Anyone can read active locker items"
on public.items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.lockers
    where lockers.id = items.locker_id
      and lockers.state = 'active'
  )
);

create policy "Sellers can create items in their own lockers"
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
      and users.role = 'seller'
  )
);

create policy "Sellers can update items in their own lockers"
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
      and users.role = 'seller'
  )
);

create policy "Sellers can delete items in their own lockers"
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
      and users.role = 'seller'
  )
);

create policy "Users can read their own orders"
on public.orders
for select
to authenticated
using (buyer_id = auth.uid());

create policy "Buyers can create orders"
on public.orders
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'buyer'
  )
  and exists (
    select 1
    from public.lockers
    where lockers.id = orders.locker_id
      and lockers.state = 'active'
  )
);

create policy "Users can read their own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.buyer_id = auth.uid()
  )
);

create policy "Buyers can create order items for their own orders"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    join public.items on items.id = order_items.item_id
    where orders.id = order_items.order_id
      and orders.buyer_id = auth.uid()
      and items.locker_id = orders.locker_id
      and items.sold = false
  )
);
