-- Isolated PostgreSQL harness only. No production users or payments are used.
begin;
insert into auth.users (id) values
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd'),
  ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee');
insert into public.admin_users(user_id) values ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee');
insert into public.subscriptions(user_id,payer_email,status,paid_until) values
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc','paid@example.test','ACTIVE',now() + interval '1 day'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd','expired@example.test','ACTIVE',now() - interval '1 day');
insert into public.products(id,name,slug) values ('cccccccc-cccc-4ccc-cccc-cccccccccccc','Audit product','audit-product');
insert into public.product_costs(product_id,supplier_cost) values ('cccccccc-cccc-4ccc-cccc-cccccccccccc',50);
select public.test_assert((select final_price = 120 from public.products where slug='audit-product'), 'price trigger still runs after revoke');
select public.test_assert((select count(*)=3 from public.profiles where id in ('cccccccc-cccc-4ccc-cccc-cccccccccccc','dddddddd-dddd-4ddd-dddd-dddddddddddd','eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee')), 'profile trigger still runs after revoke');
select public.test_assert(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
    and (has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE'))
), 'client roles have no TRUNCATE privileges');
select public.test_assert(not has_schema_privilege('authenticated','public','CREATE'), 'client cannot create database objects');
select public.test_assert(not has_function_privilege('anon','public.is_admin(uuid)','EXECUTE'), 'anonymous cannot probe admin membership');
select public.test_assert(not has_function_privilege('anon','public.has_active_subscription(uuid)','EXECUTE'), 'anonymous cannot probe subscription status');
select public.test_assert(not has_function_privilege('authenticated','public.handle_new_user()','EXECUTE'), 'profile trigger is not a client RPC');
select public.test_assert(not has_function_privilege('anon','public.recalculate_product_price()','EXECUTE'), 'price trigger is not an anonymous RPC');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select public.test_denied('select * from public.profiles');
select public.test_denied('select * from public.subscriptions');
select public.test_denied('select * from public.product_costs');
select public.test_denied('select * from public.webhook_events');
select public.test_denied('select public.is_admin()');
select public.test_denied('select public.has_active_subscription()');

set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-dddd-dddddddddddd',true);
select public.test_assert(not public.has_active_subscription(), 'expired ACTIVE record does not grant paid access');
select public.test_assert(not public.has_active_subscription('cccccccc-cccc-4ccc-cccc-cccccccccccc'), 'cannot check another users subscription');
select public.test_assert(not public.is_admin('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'), 'cannot check another users admin membership');
select public.test_assert((select count(*)=1 from public.profiles), 'only own profile is visible');
select public.test_assert((select count(*)=1 from public.subscriptions), 'only own subscription is visible');
select public.test_assert((select count(*)=0 from public.products), 'expired user cannot access member products');
select public.test_assert((select count(*)=0 from public.product_costs), 'ordinary account cannot read supplier costs');
select public.test_denied($s$update public.profiles set email='stolen@example.test'$s$);
select public.test_denied($s$update public.subscriptions set status='ACTIVE',paid_until=now()+interval '100 years'$s$);
select public.test_denied($s$insert into public.subscriptions(user_id,payer_email,status) values ('dddddddd-dddd-4ddd-dddd-dddddddddddd','x@example.test','ACTIVE')$s$);
select public.test_denied($s$insert into public.admin_users(user_id) values ('dddddddd-dddd-4ddd-dddd-dddddddddddd')$s$);
select public.test_denied($s$insert into public.webhook_events(external_event_id,event_type,result) values ('fake','payment','PROCESSED')$s$);
update public.profiles set name='Own name';
select public.test_assert((select name='Own name' from public.profiles), 'own allowed profile fields can be updated');
with changed as (update public.products set final_price=1 where slug='audit-product' returning id)
select public.test_assert(count(*)=0, 'ordinary user cannot edit GM prices') from changed;

select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-cccc-cccccccccccc',true);
select public.test_assert(public.has_active_subscription(), 'confirmed unexpired access is allowed');
select public.test_assert((select count(*)=1 from public.products where slug='audit-product'), 'paid member can read products');
select public.test_assert((select count(*)=0 from public.product_costs), 'paid member still cannot read internal costs');

select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',true);
select public.test_assert(public.is_admin(), 'administrator can check own role');
select public.test_assert((select supplier_cost=50 from public.product_costs where product_id='cccccccc-cccc-4ccc-cccc-cccccccccccc'), 'administrator can read internal cost');
update public.product_costs set supplier_cost=60 where product_id='cccccccc-cccc-4ccc-cccc-cccccccccccc';
select public.test_assert((select final_price=140 from public.products where slug='audit-product'), 'admin update invokes protected price trigger');
reset role;

select public.test_assert((select not public and file_size_limit=10485760 and not ('image/svg+xml'=any(allowed_mime_types)) from storage.buckets where id='product-images'), 'product images are private, bounded raster files');
select public.test_assert((select public and file_size_limit=2097152 and not ('image/svg+xml'=any(allowed_mime_types)) from storage.buckets where id='shop-logos'), 'public logos are bounded raster files');
create table public.audit_future_table(id integer);
create function public.audit_future_function() returns integer language sql as $$ select 1 $$;
select public.test_assert(not has_table_privilege('anon','public.audit_future_table','SELECT'), 'new tables are not anonymous by default');
select public.test_assert(not has_table_privilege('authenticated','public.audit_future_table','INSERT'), 'new tables require explicit grants');
select public.test_assert(not has_function_privilege('anon','public.audit_future_function()','EXECUTE'), 'new functions are not anonymous by default');
select public.test_assert(not has_function_privilege('authenticated','public.audit_future_function()','EXECUTE'), 'new functions require explicit grants');
rollback;
select 'Security, tenant isolation, subscriptions, admin roles and storage checks passed.' as result;
