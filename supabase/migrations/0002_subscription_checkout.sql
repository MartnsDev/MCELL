-- One durable creation attempt per account. Unknown API outcomes are reconciled,
-- never blindly retried (the preapproval API has no documented idempotency key).
alter table public.subscriptions add column if not exists checkout_reference uuid unique;
alter table public.subscriptions add column if not exists checkout_started_at timestamptz;
alter table public.subscriptions add column if not exists paid_until timestamptz;

create or replace function public.has_active_subscription(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.subscriptions where user_id = check_user_id and status = 'ACTIVE' and paid_until > now()); $$;
revoke all on function public.has_active_subscription(uuid) from public;
grant execute on function public.has_active_subscription(uuid) to authenticated;
