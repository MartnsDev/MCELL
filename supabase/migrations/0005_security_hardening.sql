-- Least-privilege grants for the existing API. No customer data is changed.
begin;

-- Supabase projects may give anon/authenticated explicit default grants. Revoking
-- PUBLIC alone does not remove those grants. New objects must opt in to access.
alter default privileges revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
-- PostgreSQL grants EXECUTE to PUBLIC globally; a schema-only REVOKE cannot
-- undo that global default. Revoke both scopes.
alter default privileges revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

revoke all on public.profiles, public.admin_users, public.subscriptions,
  public.webhook_events, public.categories, public.products, public.product_costs,
  public.product_variants, public.product_images, public.store_settings,
  public.catalog_products from public, anon, authenticated;
grant select on public.profiles, public.subscriptions, public.catalog_products to authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.products,
  public.product_costs, public.product_variants, public.product_images,
  public.store_settings to authenticated;
-- RLS still restricts writes to administrators and reads to entitled users.

-- Trigger functions are never public RPCs. Their triggers keep working without
-- EXECUTE grants to the roles inserting rows.
revoke all on function public.handle_new_user(), public.recalculate_product_price(),
  public.validate_reseller_shop(), public.validate_reseller_highlights()
  from public, anon, authenticated;
alter function public.handle_new_user() set search_path = '';
alter function public.recalculate_product_price() set search_path = '';

-- A caller can check only its own permissions, not enumerate another account.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(check_user_id = auth.uid(), false)
    and exists (select 1 from public.admin_users where user_id = check_user_id);
$$;
create or replace function public.has_active_subscription(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(check_user_id = auth.uid(), false)
    and exists (select 1 from public.subscriptions
      where user_id = check_user_id and status = 'ACTIVE' and paid_until > now());
$$;
revoke all on function public.is_admin(uuid), public.has_active_subscription(uuid)
  from public, anon, authenticated;
grant execute on function public.is_admin(uuid), public.has_active_subscription(uuid)
  to authenticated;

-- This single anonymous RPC is intentional: buyers need the published catalog,
-- but never the owner's email, account id, drafts or payment information.
revoke all on function public.read_reseller_shop(text) from public, anon, authenticated;
grant execute on function public.read_reseller_shop(text) to anon, authenticated;

update storage.buckets
  set public = false, file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'product-images';
update storage.buckets
  set public = true, file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'shop-logos';

commit;
