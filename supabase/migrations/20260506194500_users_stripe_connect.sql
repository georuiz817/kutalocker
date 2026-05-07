alter table public.users
  add column if not exists stripe_account_id text;

create unique index if not exists users_stripe_account_id_key
  on public.users (stripe_account_id)
  where stripe_account_id is not null;

alter table public.users
  drop column if exists payout_method,
  drop column if exists payout_handle;

drop type if exists public.payout_method cascade;
