-- Server-only records make the PIN gate expire and revoke independently of
-- Supabase's refreshable login session. No anonymous/customer/admin JWT can
-- create or enumerate these proof records directly.
begin;
create table public.mc_admin_pin_sessions (
 nonce_hash text primary key check(length(nonce_hash)=64),
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.mc_admin_pin_sessions enable row level security;
revoke all on public.mc_admin_pin_sessions from public,anon,authenticated;
grant select,insert,delete on public.mc_admin_pin_sessions to service_role;
create index mc_admin_pin_sessions_expiry on public.mc_admin_pin_sessions(expires_at);
commit;
