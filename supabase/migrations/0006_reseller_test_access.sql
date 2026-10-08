-- Keep the test entry free. The code unlocks the demonstration screen without
-- a payment requirement or expiration. Existing shop ownership policies,
-- private owner URLs and published buyer catalogs are unchanged.
begin;

create table public.reseller_test_access_settings (
  id boolean primary key default true check (id),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$')
);
create table public.reseller_test_access (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.reseller_test_access_settings enable row level security;
alter table public.reseller_test_access enable row level security;
revoke all on public.reseller_test_access_settings, public.reseller_test_access
  from public, anon, authenticated;

create function public.has_reseller_test_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.reseller_test_access where user_id = auth.uid());
$$;

create function public.unlock_reseller_test_access(p_code text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_code is null or p_code !~ '^[0-9]{4}$' then return false; end if;
  if not exists (
    select 1 from public.reseller_test_access_settings
    where id and code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex')
  ) then return false; end if;

  insert into public.reseller_test_access(user_id) values (current_user_id)
    on conflict (user_id) do nothing;
  return true;
end;
$$;
revoke all on function public.has_reseller_test_access(), public.unlock_reseller_test_access(text)
  from public, anon, authenticated;
grant execute on function public.has_reseller_test_access(), public.unlock_reseller_test_access(text)
  to authenticated;

commit;
