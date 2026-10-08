-- Run only in an isolated database after all migrations. The harness supplies auth/storage.
create function public.test_assert(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end $$;
create function public.test_denied(statement text) returns void language plpgsql as $$
declare denied boolean := false;
begin
  begin execute statement; exception when insufficient_privilege or check_violation or raise_exception then denied := true; end;
  if not denied then raise exception 'Statement should have failed: %', statement; end if;
end $$;
grant execute on function public.test_assert(boolean,text), public.test_denied(text) to anon, authenticated;
-- A fixture code, independent of the code configured in production.
insert into public.reseller_test_access_settings(code_hash)
values (encode(sha256(convert_to('6158', 'UTF8')), 'hex'));
insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', false);
select public.test_assert(not public.has_reseller_test_access(), 'account starts locked');
select public.test_assert(not public.unlock_reseller_test_access('0000'), 'wrong code does not unlock');
select public.test_assert(not public.unlock_reseller_test_access(null), 'missing code does not unlock');
select public.test_assert(not public.unlock_reseller_test_access('61580'), 'invalid code does not unlock');
select public.test_denied('select * from public.reseller_test_access_settings');
select public.test_denied('insert into public.reseller_test_access(user_id) values (auth.uid())');
select public.test_assert(public.unlock_reseller_test_access('6158'), 'correct code unlocks without payment');
select public.test_assert(public.unlock_reseller_test_access('6158'), 'unlock can safely be repeated');
select public.test_assert(public.has_reseller_test_access(), 'account keeps its access');
select public.test_assert((select count(*) = 0 from public.subscriptions), 'unlock does not create a subscription');
insert into public.reseller_shops(name) values ('Loja A') returning id, public_slug \gset shop_a_
select set_config('test.shop_a', :'shop_a_id', false);
select set_config('test.slug_a', :'shop_a_public_slug', false);
select public.test_assert((select count(*) = 1 from public.reseller_shops), 'owner can insert and read own shop');
select public.test_assert(public.read_reseller_shop(:'shop_a_public_slug') is null, 'draft is private');
update public.reseller_shops set whatsapp = '5511999998888', contact_email = 'a@example.test', prices = '{"gremio-2026":179.90}', published = true;
select public.test_assert((select prices->>'gremio-2026' = '179.90' from public.reseller_shops), 'owner can set price and publish');
select public.test_denied('update public.reseller_shops set owner_id = ''bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb''');
select public.test_denied('update public.reseller_shops set public_slug = ''112233445566''');
select public.test_denied('insert into public.reseller_shops (owner_id, name) values (''bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'', ''Fake'')');
select public.test_denied('update public.reseller_shops set prices = ''{"gremio-2026":119.90}''');
select public.test_denied('update public.reseller_shops set prices = ''{"gremio-2026":179.50}''');
select public.test_denied('update public.reseller_shops set prices = ''{"gremio-2026":179.901}''');
select public.test_denied('update public.reseller_shops set prices = ''{"unknown":179.90}''');
select public.test_denied('update public.reseller_shops set prices = ''[]''');
select public.test_denied('update public.reseller_shops set logo_path = ''other/logo.png''');
select public.test_denied('select * from public.reseller_catalog_prices');
insert into storage.objects(bucket_id, name) values ('shop-logos', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/' || :'shop_a_id' || '/logo.png');
select public.test_assert((select count(*) = 1 from storage.objects), 'owner can upload logo');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', false);
select public.test_assert(not public.has_reseller_test_access(), 'another account must enter the code');
select public.test_assert(public.unlock_reseller_test_access('6158'), 'second account unlocks its own access');
select public.test_assert((select count(*) = 0 from public.reseller_shops), 'another owner cannot read private settings');
select public.test_assert((select count(*) = 0 from storage.objects), 'another owner cannot list private files');
with changed as (update public.reseller_shops set name = 'Stolen' where id = current_setting('test.shop_a')::uuid returning id) select public.test_assert(count(*) = 0, 'cross-owner update blocked') from changed;
select public.test_denied(format('insert into storage.objects(bucket_id, name) values (''shop-logos'', ''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/%s/other.png'')', current_setting('test.shop_a')));
with changed as (delete from storage.objects where bucket_id = 'shop-logos' returning name) select public.test_assert(count(*) = 0, 'cross-owner delete blocked') from changed;
insert into public.reseller_shops(name, whatsapp, contact_email, prices, published) values ('Loja B', '5521999998888', 'b@example.test', '{"gremio-2026":249.90}', true) returning public_slug \gset shop_b_
select public.test_assert((select prices->>'gremio-2026' = '249.90' from public.reseller_shops), 'each owner has independent prices');
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.test_denied('select public.has_reseller_test_access()');
select public.test_denied('select public.unlock_reseller_test_access(''6158'')');
select public.test_denied('select * from public.reseller_test_access_settings');
select public.test_denied('select * from public.reseller_shops');
select public.test_denied('update public.reseller_shops set name = ''Buyer edited''');
select public.test_denied('insert into public.reseller_shops(name) values (''Buyer store'')');
select public.test_assert(public.read_reseller_shop(current_setting('test.slug_a'))->>'name' = 'Loja A', 'anonymous buyer reads published catalog');
select public.test_assert(not (public.read_reseller_shop(current_setting('test.slug_a')) ?| array['owner_id', 'contact_email', 'id']), 'public catalog excludes private fields');
select public.test_assert(public.read_reseller_shop('doesnotexist') is null, 'unknown link returns no data');
select public.test_assert(public.read_reseller_shop(:'shop_b_public_slug')->'prices'->>'gremio-2026' = '249.90', 'buyer sees that store price');
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', false);
update public.reseller_shops set published = false;
set role anon;
select public.test_assert(public.read_reseller_shop(current_setting('test.slug_a')) is null, 'deactivated link stops serving orders');
reset role;
select 'All reseller ownership, price and logo policies passed.' as result;
