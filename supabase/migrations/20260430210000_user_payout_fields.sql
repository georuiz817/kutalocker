do $$
begin
  if not exists (select 1 from pg_type where typname = 'payout_method') then
    create type public.payout_method as enum ('venmo', 'paypal');
  end if;
end
$$;

alter table public.users
  add column if not exists payout_method public.payout_method,
  add column if not exists payout_handle text;

notify pgrst, 'reload schema';
