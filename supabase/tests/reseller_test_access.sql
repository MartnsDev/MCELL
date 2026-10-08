-- The code gates the demonstration entrance. Existing owner access and buyer
-- links remain unchanged; all fixture changes below are rolled back.
begin;
delete from public.reseller_test_access where user_id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', true);
select public.test_assert(not public.has_reseller_test_access(), 'demonstration entrance starts locked');
select public.test_assert((select count(*) = 1 from public.reseller_shops), 'existing owner can still access its own shop');
select public.test_assert((select bool_and(owner_id = auth.uid()) from public.reseller_shops), 'other owners remain excluded');
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select public.test_assert(public.read_reseller_shop(current_setting('test.slug_a')) is not null, 'buyers can still read the published shop without code or login');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', true);
select public.test_assert(public.unlock_reseller_test_access('6158'), 'owner unlocks demonstration without payment');
select public.test_assert((select count(*) = 1 from public.reseller_shops), 'unlock preserves the existing shop');
rollback;
select 'Free test shop code, existing shops and public buyer access passed.' as result;
