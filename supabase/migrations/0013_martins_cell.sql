-- Additive transition: legacy rows and product IDs are preserved.
begin;
create table public.mc_categories (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 sort_order integer not null default 0, active boolean not null default true
);
create table public.mc_products (
 id uuid primary key default gen_random_uuid(), category_id uuid references public.mc_categories(id),
 name text not null, slug text not null unique, description text not null default '', brand text not null default '',
 product_type text not null default '', compatibility text not null default '', specs jsonb not null default '{}',
 images text[] not null default '{}', featured boolean not null default false, active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.mc_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.mc_products(id),
 label text not null, sku text not null unique, attributes jsonb not null default '{}', image text,
 price_cents integer not null check(price_cents>0), promo_cents integer check(promo_cents>0 and promo_cents<price_cents),
 stock integer not null default 0 check(stock>=0), active boolean not null default true,
 weight_g integer not null check(weight_g>0), height_cm integer not null check(height_cm>0),
 width_cm integer not null check(width_cm>0), length_cm integer not null check(length_cm>0),
 unique(product_id,label)
);
create table public.mc_costs (
 variant_id uuid primary key references public.mc_variants(id), cost_cents integer not null check(cost_cents>=0)
);
create table public.mc_settings (
 id boolean primary key default true check(id), whatsapp text not null default '', email text not null default '',
 pickup_enabled boolean not null default false, pickup_address text not null default '', pickup_hours text not null default '',
 origin_cep text not null default '', shipping_enabled boolean not null default false,
 payment_enabled boolean not null default false, manual_payment boolean not null default false,
 home_show_categories boolean not null default true,home_show_featured boolean not null default true,
 home_show_new boolean not null default true,home_show_bestsellers boolean not null default true,home_show_service boolean not null default true,
 service_title text not null default 'Seu celular merece uma segunda chance.',
 service_text text not null default 'Conte o que aconteceu com seu aparelho. Acompanhe o diagnóstico e aprove o orçamento antes do reparo.',
 hero_title text not null default 'Tecnologia para o seu dia. Cuidado para o seu celular.',
 hero_text text not null default 'Acessórios, eletrônicos e assistência técnica em um só lugar.',
 about text not null default '', delivery_policy text not null default '', privacy_policy text not null default '',
 repair_terms text not null default '', terms_reviewed boolean not null default false,
 packing_weight_g integer not null default 100 check(packing_weight_g>=0), packing_padding_cm integer not null default 2 check(packing_padding_cm>=0),
 check(not pickup_enabled or (length(trim(pickup_address))>0 and length(trim(pickup_hours))>0)),
 check(not shipping_enabled or origin_cep ~ '^[0-9]{8}$')
);
insert into public.mc_settings default values;
insert into public.mc_categories(name,slug,sort_order) values
 ('Capinhas','capinhas',0),('Películas','peliculas',1),('Cabos','cabos',2),('Carregadores','carregadores',3),
 ('Fones de ouvido','fones-de-ouvido',4),('Adaptadores','adaptadores',5),('Suportes','suportes',6),
 ('Power banks','power-banks',7),('Caixas de som','caixas-de-som',8),('Eletrônicos','eletronicos',9),('Outros acessórios','outros-acessorios',10);
create table public.mc_quotes (
 id uuid primary key default gen_random_uuid(), cart_hash text not null, destination_cep text not null,
 service text not null, provider text not null, price_cents integer not null check(price_cents>=0),
 days integer not null check(days>=0), expires_at timestamptz not null, payload jsonb not null
);
create table public.mc_orders (
 id uuid primary key default gen_random_uuid(), protocol text not null unique default ('MC-'||upper(encode(gen_random_bytes(6),'hex'))),
 access_hash text not null, request_key uuid not null unique, request_hash text not null,
 customer jsonb not null, delivery text not null check(delivery in ('pickup','shipping')), address jsonb,
 quote_id uuid references public.mc_quotes(id), shipping_snapshot jsonb not null, subtotal_cents integer not null check(subtotal_cents>0),
 shipping_cents integer not null check(shipping_cents>=0), total_cents integer not null,
 payment_method text not null check(payment_method in ('mercadopago','manual')),
 repair_id uuid, repair_version integer,
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','paid','preparing','ready_pickup','shipped','delivered','cancelled')),
 preference_id text, checkout_url text, payment_id text unique, tracking text not null default '',
 expires_at timestamptz not null default now()+interval '30 minutes', created_at timestamptz not null default now(),
 check(total_cents=subtotal_cents+shipping_cents),check(delivery<>'pickup' or shipping_cents=0)
);
create table public.mc_order_items (
 order_id uuid not null references public.mc_orders(id), variant_id uuid not null references public.mc_variants(id),
 quantity integer not null check(quantity>0), unit_cents integer not null check(unit_cents>0), snapshot jsonb not null,
 primary key(order_id,variant_id)
);
create table public.mc_payment_events (
 event_key text primary key, order_id uuid references public.mc_orders(id), payment_id text not null,
 status text not null, result text not null, created_at timestamptz not null default now()
);
create table public.mc_services (
 id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
 active boolean not null default true, sort_order integer not null default 0
);
insert into public.mc_services(name,sort_order) values('Troca de tela',0),('Troca de bateria',1),('Conectores e carregamento',2),('Áudio e botões',3),('Diagnóstico de falhas',4),('Outros reparos',5);
create table public.mc_repairs (
 id uuid primary key default gen_random_uuid(), protocol text not null unique default ('AT-'||upper(encode(gen_random_bytes(6),'hex'))),
 access_hash text not null unique, request_hash text not null default '', customer jsonb not null, service_id uuid references public.mc_services(id),
 brand text not null, model text not null, defect text not null, description text not null,
 modality text not null check(modality in ('in_person','mail')), photos text[] not null default '{}',
 status text not null default 'received_request' check(status in ('received_request','awaiting_shipment','device_received','diagnosing','awaiting_approval','approved','repairing','testing','ready_pickup','awaiting_postage','shipped','completed','declined','unrepairable')),
 diagnosis text not null default '', estimate_cents integer check(estimate_cents>=0), return_cents integer not null default 0 check(return_cents>=0),
 estimate_version integer not null default 0, approved_version integer, decision_at timestamptz,
 deadline text not null default '', shipping_instructions text not null default '', inbound_tracking text not null default '',
 outbound_tracking text not null default '', tests text not null default '', technical_photos text[] not null default '{}',
 terms_snapshot text not null, created_at timestamptz not null default now(),
 check(status not in ('repairing','testing','ready_pickup','awaiting_postage','shipped','completed') or approved_version=estimate_version)
);
alter table public.mc_orders add constraint mc_orders_repair_fk foreign key(repair_id) references public.mc_repairs(id);
create unique index mc_repair_order_once on public.mc_orders(repair_id,repair_version) where status<>'cancelled';
create table public.mc_repair_history (
 id uuid primary key default gen_random_uuid(), repair_id uuid not null references public.mc_repairs(id),
 status text not null, message text not null default '', public boolean not null default true, created_at timestamptz not null default now()
);
create table public.mc_audit (
 id uuid primary key default gen_random_uuid(), actor uuid, entity text not null, entity_id text,
 operation text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create table public.mc_rate_limits (
 key text primary key, window_start timestamptz not null default now(), hits integer not null default 1
);
create index mc_variants_product on public.mc_variants(product_id);
create index mc_products_category on public.mc_products(category_id);
create index mc_orders_created on public.mc_orders(created_at desc);
create index mc_orders_expiry on public.mc_orders(expires_at) where status='awaiting_payment';
create index mc_repair_history_repair on public.mc_repair_history(repair_id,created_at);
create index mc_repairs_created on public.mc_repairs(created_at desc);
create index mc_quotes_expiry on public.mc_quotes(expires_at);

-- Cost data and PII never have a public read policy.
do $$ declare t text; begin
 foreach t in array array['mc_categories','mc_products','mc_variants','mc_costs','mc_settings','mc_quotes','mc_orders','mc_order_items','mc_payment_events','mc_services','mc_repairs','mc_repair_history','mc_audit','mc_rate_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['mc_categories','mc_products','mc_variants','mc_costs','mc_settings','mc_services'] loop
  execute format('grant select,insert,update on public.%I to authenticated',t);
  execute format('create policy "admin manage" on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
 foreach t in array array['mc_orders','mc_order_items','mc_payment_events','mc_repairs','mc_repair_history','mc_audit'] loop
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy "admin read" on public.%I for select to authenticated using(public.is_admin())',t);
 end loop;
end $$;

create function public.mc_audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.mc_audit(actor,entity,entity_id,operation,before_data,after_data)
 values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'variant_id'),tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['mc_categories','mc_products','mc_variants','mc_costs','mc_settings','mc_services','mc_orders','mc_repairs'] loop
  execute format('create trigger audit_change after insert or update on public.%I for each row execute function public.mc_audit_change()',t);
 end loop;
end $$;

create function public.mc_limit(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.mc_rate_limits(key) values(p_key) on conflict(key) do update
 set hits=case when public.mc_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else public.mc_rate_limits.hits+1 end,
 window_start=case when public.mc_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else public.mc_rate_limits.window_start end returning hits into n;
 return n<=p_max;
end $$;

-- Every purchase is repriced and stock is reserved in one transaction.
-- A transaction-level lock serializes expiry, reservation and payment processing.
create function public.mc_create_order(p_items jsonb,p_customer jsonb,p_delivery text,p_address jsonb,p_quote uuid,p_cart_hash text,p_method text,p_key uuid,p_request_hash text,p_access_hash text,p_expected_subtotal integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.mc_settings; o public.mc_orders; q public.mc_quotes; v record; item jsonb; subtotal integer:=0; freight integer:=0; oid uuid; snap jsonb;
begin
 perform pg_advisory_xact_lock(7142026);
 select * into o from public.mc_orders where request_key=p_key;
 if found then
  if o.request_hash<>p_request_hash or o.access_hash<>p_access_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return o.id;
 end if;
 select * into s from public.mc_settings where id;
 if p_method='manual' and not s.manual_payment then raise exception 'PAYMENT_UNAVAILABLE'; end if;
 if p_method='mercadopago' and not s.payment_enabled then raise exception 'PAYMENT_UNAVAILABLE'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'INVALID_CART'; end if;
 if p_delivery='pickup' then
  if not s.pickup_enabled then raise exception 'PICKUP_UNAVAILABLE'; end if;
  snap=jsonb_build_object('service','Retirada local','address',s.pickup_address,'hours',s.pickup_hours);
 elsif p_delivery='shipping' then
  if not s.shipping_enabled then raise exception 'SHIPPING_UNAVAILABLE'; end if;
  select * into q from public.mc_quotes where id=p_quote for update;
  if not found or q.expires_at<=now() or q.cart_hash<>p_cart_hash or q.destination_cep<>p_address->>'cep' then raise exception 'QUOTE_EXPIRED'; end if;
  if q.payload->'quote_settings' is distinct from jsonb_build_object('origin_cep',s.origin_cep,'packing_weight_g',s.packing_weight_g,'packing_padding_cm',s.packing_padding_cm) then raise exception 'QUOTE_CHANGED'; end if;
  freight=q.price_cents; snap=to_jsonb(q)-'cart_hash';
 else raise exception 'INVALID_DELIVERY'; end if;
 -- Refuse duplicate variant rows even if a caller bypasses HTTP validation.
 if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items)x)<>jsonb_array_length(p_items) then raise exception 'INVALID_CART'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  select b.*,p.name,p.images,p.active product_active,c.active category_active into v from public.mc_variants b join public.mc_products p on p.id=b.product_id join public.mc_categories c on c.id=p.category_id where b.id=(item->>'variant_id')::uuid for update of b;
  if not found or not v.active or not v.product_active or not v.category_active or (item->>'quantity')::integer not between 1 and 99 then raise exception 'INVALID_VARIANT'; end if;
  if v.stock<(item->>'quantity')::integer then raise exception 'INSUFFICIENT_STOCK'; end if;
  if p_delivery='shipping' and not exists (
   select 1 from jsonb_array_elements(q.payload->'cart_snapshot') x
   where x->>0=v.id::text and (x->>1)::integer=(item->>'quantity')::integer
   and (x->>2)::integer=coalesce(v.promo_cents,v.price_cents)
   and (x->>3)::integer=v.weight_g and (x->>4)::integer=v.height_cm
   and (x->>5)::integer=v.width_cm and (x->>6)::integer=v.length_cm
  ) then raise exception 'QUOTE_CHANGED'; end if;
  subtotal=subtotal+coalesce(v.promo_cents,v.price_cents)*(item->>'quantity')::integer;
 end loop;
 if p_expected_subtotal is not null and subtotal<>p_expected_subtotal then raise exception 'PRICE_CHANGED'; end if;
 insert into public.mc_orders(access_hash,request_key,request_hash,customer,delivery,address,quote_id,shipping_snapshot,subtotal_cents,shipping_cents,total_cents,payment_method,expires_at)
 values(p_access_hash,p_key,p_request_hash,p_customer,p_delivery,case when p_delivery='shipping' then p_address else null end,p_quote,snap,subtotal,freight,subtotal+freight,p_method,now()+case when p_method='manual' then interval '24 hours' else interval '30 minutes' end) returning id into oid;
 for item in select value from jsonb_array_elements(p_items) loop
  select b.*,p.name,p.images into v from public.mc_variants b join public.mc_products p on p.id=b.product_id where b.id=(item->>'variant_id')::uuid;
  update public.mc_variants set stock=stock-(item->>'quantity')::integer where id=v.id;
  insert into public.mc_order_items values(oid,v.id,(item->>'quantity')::integer,coalesce(v.promo_cents,v.price_cents),jsonb_build_object('name',v.name,'label',v.label,'sku',v.sku,'image',coalesce(v.image,v.images[1])));
 end loop;
 return oid;
end $$;

create function public.mc_expire_orders() returns integer language plpgsql security definer set search_path='' as $$
declare o record; n integer:=0;
begin
 perform pg_advisory_xact_lock(7142026);
 for o in select id from public.mc_orders where status='awaiting_payment' and expires_at<now() for update loop
  update public.mc_variants v set stock=v.stock+i.quantity from public.mc_order_items i where i.order_id=o.id and i.variant_id=v.id;
  update public.mc_orders set status='cancelled' where id=o.id;n=n+1;
 end loop;return n;
end $$;

create function public.mc_record_payment(p_event text,p_order uuid,p_payment text,p_status text,p_amount integer,p_currency text) returns text language plpgsql security definer set search_path='' as $$
declare o public.mc_orders; result text;
begin
 perform pg_advisory_xact_lock(7142026);
 if exists(select 1 from public.mc_payment_events where event_key=p_event) then return 'duplicate'; end if;
 select * into o from public.mc_orders where id=p_order for update;
 if not found then raise exception 'UNKNOWN_ORDER'; end if;
 if p_currency<>'BRL' or p_amount<>o.total_cents or o.payment_method<>'mercadopago' then raise exception 'PAYMENT_MISMATCH'; end if;
 result='recorded';
 if p_status='approved' then
  if o.status='cancelled' then result='late_payment_requires_refund';
  elsif o.payment_id is not null and o.payment_id<>p_payment then result='extra_payment_requires_refund';
  elsif o.status='awaiting_payment' then update public.mc_orders set status='paid',payment_id=p_payment where id=o.id;result='paid';
  else result='already_paid'; end if;
 elsif p_status in ('refunded','charged_back') then result='refund_requires_review';
 end if;
 insert into public.mc_payment_events values(p_event,o.id,p_payment,p_status,result,now());
 return result;
end $$;

create function public.mc_update_order(p_id uuid,p_status text,p_tracking text) returns void language plpgsql security definer set search_path='' as $$
declare o public.mc_orders;
begin
 if not public.is_admin() then raise exception 'UNAUTHORIZED'; end if;
 perform pg_advisory_xact_lock(7142026);
 select * into o from public.mc_orders where id=p_id for update;
 if not found then raise exception 'UNKNOWN_ORDER'; end if;
 if p_status='paid' and o.payment_method='manual' and o.status='awaiting_payment' then null;
 elsif p_status='cancelled' and o.status='awaiting_payment' then
  update public.mc_variants v set stock=v.stock+i.quantity from public.mc_order_items i where i.order_id=o.id and i.variant_id=v.id;
 elsif (o.status,p_status) in (('paid','preparing'),('preparing','ready_pickup'),('preparing','shipped'),('ready_pickup','delivered'),('shipped','delivered')) then
  if p_status='shipped' and (o.delivery<>'shipping' or length(trim(p_tracking))=0) then raise exception 'TRACKING_REQUIRED'; end if;
  if p_status='ready_pickup' and o.delivery<>'pickup' then raise exception 'INVALID_DELIVERY'; end if;
 else raise exception 'INVALID_TRANSITION'; end if;
 update public.mc_orders set status=p_status,tracking=p_tracking where id=p_id;
end $$;

create function public.mc_repair_decision(p_id uuid,p_hash text,p_version integer,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.mc_repairs;
begin
 select * into r from public.mc_repairs where id=p_id and access_hash=p_hash for update;
 if not found then raise exception 'UNAUTHORIZED'; end if;
 if r.status<>'awaiting_approval' or r.estimate_version<>p_version then raise exception 'ESTIMATE_CHANGED'; end if;
 update public.mc_repairs set status=case when p_approve then 'approved' else 'declined' end,approved_version=case when p_approve then estimate_version else null end,decision_at=now() where id=p_id;
 insert into public.mc_repair_history(repair_id,status,message) values(p_id,case when p_approve then 'approved' else 'declined' end,'Decisão registrada pelo cliente sobre orçamento versão '||p_version);
end $$;

create function public.mc_admin_repair(p_id uuid,p_patch jsonb,p_message text,p_public boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.mc_repairs; target text; changed boolean;
begin
 if not public.is_admin() then raise exception 'UNAUTHORIZED'; end if;
 select * into r from public.mc_repairs where id=p_id for update;
 if not found then raise exception 'UNKNOWN_REPAIR'; end if;
 target=coalesce(p_patch->>'status',r.status);
 changed=(p_patch ? 'estimate_cents' and (p_patch->>'estimate_cents')::integer is distinct from r.estimate_cents) or (p_patch ? 'return_cents' and (p_patch->>'return_cents')::integer is distinct from r.return_cents) or (p_patch ? 'diagnosis' and p_patch->>'diagnosis' is distinct from r.diagnosis);
 if changed and exists(select 1 from public.mc_orders where repair_id=r.id and status in ('paid','preparing','ready_pickup','shipped','delivered')) then raise exception 'PAID_ESTIMATE_REQUIRES_RECONCILIATION'; end if;
 if changed then update public.mc_orders set status='cancelled' where repair_id=r.id and status='awaiting_payment'; end if;
 if changed and r.status in ('shipped','completed') then raise exception 'REPAIR_CLOSED'; end if;
 if changed and target<>'awaiting_approval' then raise exception 'REAPPROVAL_REQUIRED'; end if;
 if target<>r.status and not changed and not ((r.status,target) in
 (('received_request','awaiting_shipment'),('received_request','device_received'),('awaiting_shipment','device_received'),('device_received','diagnosing'),('diagnosing','awaiting_approval'),('diagnosing','unrepairable'),('approved','repairing'),('repairing','testing'),('testing','ready_pickup'),('testing','awaiting_postage'),('ready_pickup','completed'),('awaiting_postage','shipped'),('shipped','completed'),('declined','awaiting_postage'),('unrepairable','awaiting_postage'))) then raise exception 'INVALID_TRANSITION'; end if;
 if target='awaiting_shipment' and length(coalesce(p_patch->>'shipping_instructions',r.shipping_instructions))=0 then raise exception 'INSTRUCTIONS_REQUIRED'; end if;
 if target='awaiting_approval' and coalesce((p_patch->>'estimate_cents')::integer,r.estimate_cents) is null then raise exception 'ESTIMATE_REQUIRED'; end if;
 if target in ('ready_pickup','awaiting_postage') and r.status='testing' and length(coalesce(p_patch->>'tests',r.tests))=0 then raise exception 'TESTS_REQUIRED'; end if;
 if target='shipped' and length(coalesce(p_patch->>'outbound_tracking',r.outbound_tracking))=0 then raise exception 'TRACKING_REQUIRED'; end if;
 -- Refused/unrepairable devices may be returned without repair approval.
 if target in ('awaiting_postage','shipped','completed') and (r.status in ('declined','unrepairable') or r.approved_version is null) then
  -- The workflow check below distinguishes a return from repair execution.
  null;
 end if;
 update public.mc_repairs set status=target,
 diagnosis=coalesce(p_patch->>'diagnosis',diagnosis),estimate_cents=coalesce((p_patch->>'estimate_cents')::integer,estimate_cents),
 return_cents=coalesce((p_patch->>'return_cents')::integer,return_cents),deadline=coalesce(p_patch->>'deadline',deadline),
 shipping_instructions=coalesce(p_patch->>'shipping_instructions',shipping_instructions),inbound_tracking=coalesce(p_patch->>'inbound_tracking',inbound_tracking),
 outbound_tracking=coalesce(p_patch->>'outbound_tracking',outbound_tracking),tests=coalesce(p_patch->>'tests',tests),
 estimate_version=estimate_version+case when changed then 1 else 0 end,approved_version=case when changed then null else approved_version end,
 technical_photos=case when p_patch ? 'technical_photos' then array(select jsonb_array_elements_text(p_patch->'technical_photos')) else technical_photos end
 where id=p_id;
 insert into public.mc_repair_history(repair_id,status,message,public) values(p_id,target,p_message,p_public);
end $$;
-- Approval is mandatory for repair execution. Return of refused devices remains possible.
alter table public.mc_repairs drop constraint mc_repairs_check;
alter table public.mc_repairs add constraint mc_repair_approval check(status not in ('repairing','testing','ready_pickup') or (approved_version is not null and approved_version=estimate_version));

create function public.mc_save_product(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); v jsonb; vid uuid; ids uuid[]:='{}';
begin
 if not public.is_admin() then raise exception 'UNAUTHORIZED'; end if;
 perform pg_advisory_xact_lock(7142026);
 insert into public.mc_products(id,category_id,name,slug,description,brand,product_type,compatibility,specs,images,featured,active)
 values(pid,(p->>'category_id')::uuid,p->>'name',p->>'slug',p->>'description',p->>'brand',p->>'product_type',p->>'compatibility',p->'specs',array(select jsonb_array_elements_text(p->'images')),(p->>'featured')::boolean,(p->>'active')::boolean)
 on conflict(id) do update set category_id=excluded.category_id,name=excluded.name,slug=excluded.slug,description=excluded.description,brand=excluded.brand,product_type=excluded.product_type,compatibility=excluded.compatibility,specs=excluded.specs,images=excluded.images,featured=excluded.featured,active=excluded.active;
 for v in select value from jsonb_array_elements(p->'variants') loop
  vid=coalesce((v->>'id')::uuid,gen_random_uuid());
  if exists(select 1 from public.mc_variants where id=vid and product_id<>pid) then raise exception 'INVALID_VARIANT'; end if;
  insert into public.mc_variants(id,product_id,label,sku,attributes,image,price_cents,promo_cents,stock,active,weight_g,height_cm,width_cm,length_cm)
  values(vid,pid,v->>'label',v->>'sku',v->'attributes',v->>'image',(v->>'price_cents')::integer,(v->>'promo_cents')::integer,(v->>'stock')::integer,(v->>'active')::boolean,(v->>'weight_g')::integer,(v->>'height_cm')::integer,(v->>'width_cm')::integer,(v->>'length_cm')::integer)
  on conflict(id) do update set label=excluded.label,sku=excluded.sku,attributes=excluded.attributes,image=excluded.image,price_cents=excluded.price_cents,promo_cents=excluded.promo_cents,stock=excluded.stock,active=excluded.active,weight_g=excluded.weight_g,height_cm=excluded.height_cm,width_cm=excluded.width_cm,length_cm=excluded.length_cm;
  insert into public.mc_costs values(vid,(v->>'cost_cents')::integer) on conflict(variant_id) do update set cost_cents=excluded.cost_cents;
  ids=array_append(ids,vid);
 end loop;
 update public.mc_variants set active=false where product_id=pid and not(id=any(ids));
 return pid;
end $$;

create function public.mc_create_repair_order(p_repair uuid,p_hash text,p_method text,p_key uuid,p_order_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.mc_repairs; s public.mc_settings; oid uuid; existing public.mc_orders;
begin
 perform pg_advisory_xact_lock(7142026);
 select * into r from public.mc_repairs where id=p_repair and access_hash=p_hash for update;
 if not found then raise exception 'UNAUTHORIZED'; end if;
 if r.approved_version is null or r.approved_version<>r.estimate_version then raise exception 'APPROVAL_REQUIRED'; end if;
 if r.status not in ('approved','repairing','testing','ready_pickup','awaiting_postage') then raise exception 'INVALID_REPAIR_STATE'; end if;
 select * into s from public.mc_settings where id;
 if (p_method='manual' and not s.manual_payment) or (p_method='mercadopago' and not s.payment_enabled) or p_method not in ('manual','mercadopago') then raise exception 'PAYMENT_UNAVAILABLE'; end if;
 select * into existing from public.mc_orders where repair_id=r.id and repair_version=r.estimate_version and status<>'cancelled';
 if found then return existing.id; end if;
 if coalesce(r.estimate_cents,0)+r.return_cents<=0 then raise exception 'INVALID_ESTIMATE'; end if;
 insert into public.mc_orders(access_hash,request_key,request_hash,customer,delivery,shipping_snapshot,subtotal_cents,shipping_cents,total_cents,payment_method,repair_id,repair_version,expires_at)
 values(p_hash,p_key,p_order_hash,r.customer,case when r.return_cents>0 then 'shipping' else 'pickup' end,jsonb_build_object('service','Assistência — '||r.protocol,'repair_version',r.estimate_version),r.estimate_cents,r.return_cents,r.estimate_cents+r.return_cents,p_method,r.id,r.estimate_version,now()+interval '24 hours') returning id into oid;
 return oid;
end $$;

create function public.mc_repair_created() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.mc_repair_history(repair_id,status,message) values(new.id,new.status,'Solicitação recebida. Aguarde as instruções de atendimento.');return new;end $$;
create trigger repair_initial_history after insert on public.mc_repairs for each row execute function public.mc_repair_created();

create function public.mc_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'UNAUTHORIZED'; end if;
 return jsonb_build_object('orders',(select count(*) from public.mc_orders),
 'paid_orders',(select count(*) from public.mc_orders o where status in ('paid','preparing','ready_pickup','shipped','delivered') and not exists(select 1 from public.mc_payment_events e where e.order_id=o.id and e.status in ('refunded','charged_back'))),
 'revenue_cents',(select coalesce(sum(total_cents),0) from public.mc_orders o where status in ('paid','preparing','ready_pickup','shipped','delivered') and not exists(select 1 from public.mc_payment_events e where e.order_id=o.id and e.status in ('refunded','charged_back'))),
 'repairs',(select count(*) from public.mc_repairs),'products',(select count(*) from public.mc_products));
end $$;

-- The public catalog is a narrow RPC, with no costs or inactive products.
create function public.mc_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name) from public.mc_categories c where active),'[]'),
 'products',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('sold_count',coalesce((select sum(i.quantity) from public.mc_order_items i join public.mc_orders o on o.id=i.order_id join public.mc_variants b on b.id=i.variant_id where b.product_id=p.id and o.status in ('paid','preparing','ready_pickup','shipped','delivered') and not exists(select 1 from public.mc_payment_events e where e.order_id=o.id and e.status in ('refunded','charged_back'))),0),'variants',coalesce((select jsonb_agg(to_jsonb(v) order by v.label) from public.mc_variants v where v.product_id=p.id and v.active),'[]')) order by p.created_at desc) from public.mc_products p join public.mc_categories c on c.id=p.category_id where p.active and c.active),'[]'),
 'settings',(select to_jsonb(s)-'origin_cep' from public.mc_settings s where id),
 'services',coalesce((select jsonb_agg(to_jsonb(x) order by sort_order) from public.mc_services x where active),'[]'));
$$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'mc_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
grant execute on function public.mc_catalog() to anon,authenticated;
grant execute on function public.mc_dashboard() to authenticated;
grant execute on function public.mc_save_product(jsonb) to authenticated;
grant execute on function public.mc_update_order(uuid,text,text),public.mc_admin_repair(uuid,jsonb,text,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('mc-products','mc-products',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('mc-repairs','mc-repairs',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "mc admin images" on storage.objects for all to authenticated using(bucket_id in ('mc-products','mc-repairs') and public.is_admin()) with check(bucket_id in ('mc-products','mc-repairs') and public.is_admin());
commit;
