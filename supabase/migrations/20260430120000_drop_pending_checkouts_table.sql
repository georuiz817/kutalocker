-- Cart + fulfillment uses Stripe Checkout Session metadata only
drop table if exists public.pending_checkouts;

notify pgrst, 'reload schema';
