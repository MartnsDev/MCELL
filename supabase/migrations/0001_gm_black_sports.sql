create extension if not exists pgcrypto;

create type public.subscription_status as enum ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = check_user_id); $$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status public.subscription_status not null default 'PENDING',
  external_status text,
  mercadopago_subscription_id text unique,
  payer_email text not null,
  started_at timestamptz,
  next_payment_date timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  external_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  result text not null
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  final_price numeric(12,2) not null default 0 check (final_price >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  supplier_cost numeric(12,2) not null check (supplier_cost >= 0),
  shipping_cost numeric(12,2) not null default 20.00 check (shipping_cost >= 0),
  internal_notes text,
  updated_at timestamptz not null default now()
);

create or replace function public.recalculate_product_price()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  update public.products set final_price = round((new.supplier_cost * 2 + new.shipping_cost)::numeric, 2), updated_at = now() where id = new.product_id;
  return new;
end; $$;
create trigger product_cost_price_trigger after insert or update of supplier_cost, shipping_cost on public.product_costs for each row execute function public.recalculate_product_price();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  available boolean not null default true,
  unique(product_id, size)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  id boolean primary key default true check (id),
  whatsapp_number text not null default '',
  instagram_handle text not null default '',
  short_description text not null default '',
  default_shipping_cost numeric(12,2) not null default 20.00 check (default_shipping_cost >= 0),
  updated_at timestamptz not null default now()
);
insert into public.store_settings default values on conflict do nothing;

create or replace function public.has_active_subscription(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.subscriptions where user_id = check_user_id and status = 'ACTIVE'); $$;
revoke all on function public.has_active_subscription(uuid) from public;
grant execute on function public.has_active_subscription(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, name, email, avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, new.raw_user_meta_data->>'avatar_url') on conflict (id) do update set email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url, updated_at = now(); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "subscription own read" on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy "catalog active subscribers" on public.categories for select to authenticated using (public.has_active_subscription());
create policy "products active subscribers" on public.products for select to authenticated using (public.has_active_subscription());
create policy "variants active subscribers" on public.product_variants for select to authenticated using (public.has_active_subscription());
create policy "images active subscribers" on public.product_images for select to authenticated using (public.has_active_subscription());
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage costs" on public.product_costs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage variants" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage settings" on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace view public.catalog_products with (security_invoker = true) as select id, category_id, name, slug, short_description, final_price, featured, active, created_at, updated_at from public.products where active;

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false) on conflict (id) do nothing;
create policy "admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "members read product images" on storage.objects for select to authenticated using (bucket_id = 'product-images' and (public.is_admin() or public.has_active_subscription()));

revoke all on public.admin_users, public.webhook_events from anon, authenticated;
revoke all on public.product_costs from anon;
revoke update on public.profiles from authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.product_costs to authenticated;
