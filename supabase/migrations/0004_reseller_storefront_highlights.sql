-- Owner-selected storefront order. Existing ownership policies stay in effect.
begin;

alter table public.reseller_shops
  add column featured_product_ids text[] not null default '{}';
grant insert (featured_product_ids), update (featured_product_ids) on public.reseller_shops to authenticated;

create function public.validate_reseller_highlights()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if cardinality(new.featured_product_ids) > 8 or array_ndims(new.featured_product_ids) > 1 then
    raise exception 'Choose up to eight featured products';
  end if;
  if cardinality(new.featured_product_ids) <> (select count(distinct value) from unnest(new.featured_product_ids) as ids(value)) then
    raise exception 'Featured products must be unique and non-null';
  end if;
  if exists (
    select 1 from unnest(new.featured_product_ids) as ids(value)
    where not exists (select 1 from public.reseller_catalog_prices p where p.product_id = ids.value)
  ) then raise exception 'Unknown featured product'; end if;
  return new;
end;
$$;
revoke all on function public.validate_reseller_highlights() from public, anon, authenticated;
create trigger validate_reseller_highlights before insert or update of featured_product_ids on public.reseller_shops for each row execute function public.validate_reseller_highlights();

create or replace function public.read_reseller_shop(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('name', name, 'whatsapp', whatsapp, 'instagram', instagram, 'color', color, 'logo_path', logo_path, 'prices', prices, 'featured_product_ids', featured_product_ids)
  from public.reseller_shops where public_slug = p_slug and published = true;
$$;
revoke all on function public.read_reseller_shop(text) from public;
grant execute on function public.read_reseller_shop(text) to anon, authenticated;

commit;
