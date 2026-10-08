#!/bin/sh
# Isolated socket-only database; never connects to production.
set -eu
mc_root=$(cd "$(dirname "$0")/.." && pwd)
mc_bin=$(pg_config --bindir)
mc_dir=$(mktemp -d /tmp/martins-cell-db.XXXXXX)
cleanup() { "$mc_bin/pg_ctl" -D "$mc_dir/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$mc_dir"; }
trap cleanup EXIT INT TERM
"$mc_bin/initdb" -D "$mc_dir/data" --auth=trust --no-instructions >"$mc_dir/init.log"
"$mc_bin/pg_ctl" -D "$mc_dir/data" -l "$mc_dir/server.log" -o "-k $mc_dir -p 55439 -h ''" -w start >/dev/null
cat > "$mc_dir/bootstrap.sql" <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text not null default 'test@example.test',raw_user_meta_data jsonb not null default '{}');
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public,storage to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
alter table storage.objects enable row level security;grant all on storage.objects to anon,authenticated;
SQL
set -- -f "$mc_dir/bootstrap.sql"
for mc_migration in "$mc_root"/supabase/migrations/*.sql; do set -- "$@" -f "$mc_migration"; done
if ! "$mc_bin/psql" -h "$mc_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 "$@" -f "$mc_root/supabase/tests/commerce.sql" >"$mc_dir/tests.log" 2>&1; then cat "$mc_dir/tests.log"; exit 1; fi
tail -12 "$mc_dir/tests.log"
# Two independent database connections compete for the last unit.
"$mc_bin/psql" -h "$mc_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 >"$mc_dir/concurrent-setup.log" <<'SQL'
update public.mc_settings set pickup_enabled=true,pickup_address='ISOLATED TEST',pickup_hours='ISOLATED TEST',manual_payment=true;
insert into public.mc_products(id,category_id,name,slug,active) values('00000000-0000-4000-8000-000000000090',(select id from public.mc_categories limit 1),'Concurrency test','concurrency-test',true);
insert into public.mc_variants(id,product_id,label,sku,price_cents,stock,weight_g,height_cm,width_cm,length_cm) values('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000090','Only unit','CONCURRENT-TEST',100,1,100,2,11,16);
SQL
cat > "$mc_dir/concurrent.sql" <<'SQL'
begin;
select public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000091","quantity":1}]','{}','pickup',null,null,'test','manual',gen_random_uuid(),'concurrent','private');
select pg_sleep(0.5);
commit;
SQL
(
 set +e
 "$mc_bin/psql" -h "$mc_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$mc_dir/concurrent.sql" >"$mc_dir/client1.log" 2>&1
 echo "$?" >"$mc_dir/client1.code"
) &
mc_pid1=$!
(
 set +e
 "$mc_bin/psql" -h "$mc_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$mc_dir/concurrent.sql" >"$mc_dir/client2.log" 2>&1
 echo "$?" >"$mc_dir/client2.code"
) &
mc_pid2=$!
wait "$mc_pid1"
wait "$mc_pid2"
mc_codes=$(cat "$mc_dir/client1.code" "$mc_dir/client2.code" | sort | tr '\n' ' ')
if [ "$mc_codes" != '0 3 ' ]; then cat "$mc_dir/client1.log" "$mc_dir/client2.log"; exit 1; fi
"$mc_bin/psql" -h "$mc_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select stock from public.mc_variants where sku='CONCURRENT-TEST')<>0 then raise exception 'oversold stock';end if;
 if (select count(*) from public.mc_order_items where variant_id='00000000-0000-4000-8000-000000000091')<>1 then raise exception 'duplicate last unit';end if;
end$$;
SQL
echo 'PASS: simultaneous purchases reserve the last unit only once'
