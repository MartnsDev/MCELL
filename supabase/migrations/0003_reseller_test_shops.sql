-- Test storefronts are independent of paid memberships. This migration does not
-- grant access to GM's subscriber-only catalog or change subscription status.
begin;

create table public.reseller_catalog_prices (
  product_id text primary key,
  base_price numeric(12,2) not null check (base_price >= 0)
);
alter table public.reseller_catalog_prices enable row level security;
revoke all on public.reseller_catalog_prices from public, anon, authenticated;

create table public.reseller_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() unique references auth.users(id) on delete cascade,
  public_slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  name text not null default '',
  whatsapp text not null default '',
  contact_email text not null default '',
  instagram text not null default '',
  color text not null default '#087c4b',
  logo_path text not null default '',
  prices jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (public_slug ~ '^[a-f0-9]{12}$'),
  check (length(name) <= 60 and length(contact_email) <= 150 and length(instagram) <= 200),
  check (color ~ '^#[a-fA-F0-9]{6}$'),
  check (whatsapp = '' or whatsapp ~ '^55[0-9]{10,11}$'),
  check (instagram = '' or instagram ~ '^https://(www\.)?instagram\.com(/[^[:space:]]*)?$'),
  check (contact_email = '' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (logo_path = '' or logo_path ~ ('^' || owner_id::text || '/' || id::text || '/[a-f0-9-]+\.(png|jpg|webp)$')),
  check (not published or (length(trim(name)) >= 2 and whatsapp <> '' and contact_email <> ''))
);
alter table public.reseller_shops enable row level security;
revoke all on public.reseller_shops from public, anon, authenticated;
grant select on public.reseller_shops to authenticated;
grant insert (name, whatsapp, contact_email, instagram, color, logo_path, prices, published) on public.reseller_shops to authenticated;
grant update (name, whatsapp, contact_email, instagram, color, logo_path, prices, published) on public.reseller_shops to authenticated;
create policy "owner reads own shop" on public.reseller_shops for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner creates own shop" on public.reseller_shops for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owner edits own shop" on public.reseller_shops for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function public.validate_reseller_shop()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare item record; base numeric; amount numeric;
begin
  if tg_op = 'UPDATE' and (new.id <> old.id or new.owner_id <> old.owner_id or new.public_slug <> old.public_slug) then
    raise exception 'Shop identity cannot be changed';
  end if;
  if jsonb_typeof(new.prices) <> 'object' or octet_length(new.prices::text) > 40000 then raise exception 'Invalid prices'; end if;
  for item in select * from jsonb_each(new.prices) loop
    if jsonb_typeof(item.value) <> 'number' then raise exception 'Invalid price'; end if;
    select base_price into base from public.reseller_catalog_prices where product_id = item.key;
    if not found then raise exception 'Unknown product'; end if;
    amount := (item.value::text)::numeric;
    if amount <= base or amount > 100000 or amount * 100 <> trunc(amount * 100) or mod(amount * 100, 100) <> 90 then
      raise exception 'Resale prices must exceed GM prices and end in .90';
    end if;
  end loop;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.validate_reseller_shop() from public, anon, authenticated;
create trigger validate_reseller_shop before insert or update on public.reseller_shops for each row execute function public.validate_reseller_shop();

-- Anonymous visitors receive only the public storefront fields. Contact email,
-- owner identity and draft shops are never returned by this function.
create function public.read_reseller_shop(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('name', name, 'whatsapp', whatsapp, 'instagram', instagram, 'color', color, 'logo_path', logo_path, 'prices', prices)
  from public.reseller_shops where public_slug = p_slug and published = true;
$$;
revoke all on function public.read_reseller_shop(text) from public;
grant execute on function public.read_reseller_shop(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-logos', 'shop-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']) on conflict (id) do nothing;
create policy "owner uploads shop logo" on storage.objects for insert to authenticated
with check (bucket_id = 'shop-logos' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text and exists (select 1 from public.reseller_shops s where s.owner_id = (select auth.uid()) and s.id::text = (storage.foldername(storage.objects.name))[2]));
create policy "owner removes shop logo" on storage.objects for delete to authenticated
using (bucket_id = 'shop-logos' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text and exists (select 1 from public.reseller_shops s where s.owner_id = (select auth.uid()) and s.id::text = (storage.foldername(storage.objects.name))[2]));
create policy "owner lists shop logos" on storage.objects for select to authenticated
using (bucket_id = 'shop-logos' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text);

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('gremio-2026', 119.90),
  ('arsenal-2026', 119.90),
  ('milan-branca-2026', 149.90),
  ('bayern-2026', 149.90),
  ('juventus-2026', 119.90),
  ('dortmund-2026', 119.90),
  ('manchester-city-azul', 119.90),
  ('juventus-branca-2026', 119.90),
  ('juventus-azul-2026', 119.90),
  ('real-madrid-branca-2025', 149.90),
  ('barcelona-branca-2026', 149.90),
  ('botafogo-2026', 119.90),
  ('benfica-2026', 119.90),
  ('manchester-united-preta', 119.90),
  ('chelsea-azul-2026', 149.90),
  ('manchester-united-branca', 119.90),
  ('manchester-city-branca', 119.90),
  ('alemanha-branca', 139.90),
  ('boca-juniors-2026', 149.90),
  ('inter-azul-2026', 149.90),
  ('psg-azul-escuro', 119.90),
  ('inter-branca-2026', 119.90),
  ('rangers-2026', 119.90),
  ('remo-branca-2026', 119.90),
  ('nautico-2026', 149.90),
  ('milan-vermelha-2026', 149.90),
  ('manchester-city-marmorizada', 149.90),
  ('croacia-jogador-2025', 119.90),
  ('palmeiras-verde-2024', 119.90),
  ('barcelona-2026', 119.90),
  ('santos-branca-2026', 119.90),
  ('psg-jogador-2023', 119.90),
  ('sao-paulo-jogador-uniforme-3', 119.90),
  ('bayern-kit-infantil', 119.90),
  ('corinthians-branca', 119.90),
  ('camiseta-preta-estampa-vermelha', 119.90),
  ('bahia-listrada-gola-polo', 119.90),
  ('barcelona-retro-neymar', 199.90),
  ('bayer-leverkusen-branca', 119.90),
  ('borussia-amarela', 119.90),
  ('real-madrid-y3-roxa', 119.90),
  ('sao-paulo-goleiro-preta', 119.90),
  ('bayern-vermelha-2026', 139.90),
  ('santos-listrada-2026', 139.90),
  ('botafogo-branca-2026', 139.90),
  ('cruzeiro-branca-2026', 139.90),
  ('gremio-tricolor-2026', 139.90),
  ('noruega-haaland-2026', 139.90),
  ('psg-2026', 139.90),
  ('agasalho-alemanha-preto', 279.90),
  ('agasalho-barcelona-preto', 279.90),
  ('agasalho-brasil-amarelo', 279.90),
  ('agasalho-brasil-azul', 279.90),
  ('agasalho-corinthians-branco', 279.90),
  ('agasalho-corinthians-preto', 279.90),
  ('agasalho-corinthians-roxo', 279.90),
  ('agasalho-cruzeiro-azul', 279.90),
  ('agasalho-flamengo-vermelho', 279.90),
  ('agasalho-flamengo-azul-claro', 279.90),
  ('agasalho-flamengo-marrom', 279.90),
  ('agasalho-psg-azul', 279.90),
  ('agasalho-santos-azul', 279.90),
  ('bone-internacional-vermelho', 49.90),
  ('corrente-3-por-1-1-2mm', 85.90),
  ('corrente-cadeado-1-2mm-70cm', 85.90),
  ('caixinha-brasil-azul-camisa-nao-inclusa', 25.00),
  ('caixinha-brasil-pele-camisa-nao-inclusa', 25.00),
  ('caixinha-vasco-preto-camisa-nao-inclusa', 25.00),
  ('caixinha-atletico-mineiro-camisa-nao-inclusa', 25.00),
  ('chaveiro-bandeira-brasil', 10.00),
  ('chaveiro-sao-paulo', 10.00),
  ('chaveiro-barcelona', 10.00),
  ('chaveiro-chelsea', 10.00),
  ('chaveiro-flamengo-escudo-antigo', 10.00),
  ('chaveiro-flamengo-escudo-novo', 10.00),
  ('chaveiro-real-madrid', 10.00),
  ('corrente-carrier-cubinho-2-8-mm', 99.90),
  ('corrente-3-por-1-4-5mm', 99.90),
  ('feminina-corinthians-branca-2026', 149.90),
  ('feminina-corinthians-roxa', 139.90),
  ('feminina-flamengo-listrada', 149.90),
  ('feminina-palmeiras-branca-2026', 149.90),
  ('feminina-palmeiras-branca-crefisa', 149.90),
  ('feminina-palmeiras-listrada', 149.90),
  ('feminina-palmeiras-verde-2026', 149.90),
  ('feminina-sao-paulo-branca', 149.90),
  ('feminina-flamengo-cinza-2024', 139.90),
  ('jogador-chelsea-preta-2026', 169.90),
  ('jogador-corinthians-branca-2026', 199.90),
  ('jogador-flamengo-listrada-2026', 199.90),
  ('kit-infantil-corinthians-listrada-2026', 139.90),
  ('kit-infantil-corinthians-branca-2026', 99.90),
  ('kit-infantil-inter-miami-messi-rosa', 139.90),
  ('kit-infantil-tailandesa-manchester-united-vermelha', 139.90),
  ('kit-infantil-tailandesa-palmeiras-verde-sportingbet', 139.90),
  ('kit-infantil-tailandesa-santos-branca', 139.90),
  ('kit-infantil-tailandesa-sao-paulo-branca-2025', 139.90),
  ('tailandesa-torcedor-corinthians-preta-2026', 149.90),
  ('oculos-oakley-carbon-lente-roxa', 99.90),
  ('oculos-oakley-plasma-lente-vermelha', 99.90),
  ('oculos-oakley-x-metal-lente-preta', 99.90),
  ('oculos-oakley-x-metal-lente-azul', 99.90),
  ('oculos-oakley-x-metal-lente-preta-modelo-2', 99.90),
  ('camiseta-oversized-homem-aranha-1', 99.90),
  ('palmeiras-verde-manga-longa', 149.90),
  ('tailandesa-torcedor-flamengo-branca', 119.90),
  ('pingente-oval-com-cruz-2-4m', 25.00),
  ('pingente-placa-versiculo-pequena', 25.00),
  ('pingente-sao-jorge-2-5cm', 25.00),
  ('regata-nba-miami-preta', 149.90),
  ('regata-machao-homem-aranha-1', 85.90),
  ('regata-machao-homem-aranha-10', 85.90),
  ('regata-machao-homem-aranha-11', 85.90),
  ('regata-machao-homem-aranha-12', 85.90),
  ('regata-machao-homem-aranha-2', 85.90),
  ('regata-machao-homem-aranha-3', 85.90),
  ('regata-machao-homem-aranha-4', 85.90),
  ('regata-machao-homem-aranha-5', 85.90),
  ('regata-machao-homem-aranha-6', 85.90),
  ('regata-machao-homem-aranha-7', 85.90),
  ('regata-machao-homem-aranha-8', 85.90),
  ('regata-machao-homem-aranha-9', 85.90),
  ('regata-nba-celtics-verde', 149.90),
  ('retro-tailandesa-brasil-ronaldinho-2006-amarela', 199.90),
  ('retro-tailandesa-brasil-ronaldinho-2006-azul', 199.90),
  ('regata-nba-philadelphia', 149.90),
  ('camiseta-oversized-homem-aranha-10', 89.90),
  ('camiseta-oversized-homem-aranha-11', 89.90),
  ('camiseta-oversized-homem-aranha-12', 89.90),
  ('camiseta-oversized-homem-aranha-2', 89.90),
  ('camiseta-oversized-homem-aranha-3', 89.90),
  ('camiseta-oversized-homem-aranha-5', 89.90),
  ('camiseta-oversized-homem-aranha-6', 89.90),
  ('camiseta-oversized-homem-aranha-7', 89.90),
  ('camiseta-oversized-homem-aranha-9', 89.90),
  ('pingente-cruz-agulha-p', 20.00),
  ('pingente-cruz-com-cristo-p', 20.00),
  ('pingente-cruz-cristo-em-relevo-3-2cm', 20.00),
  ('pingente-cruz-detalhada-2-6cm', 30.00),
  ('pingente-cruz-vazada-3-8m', 30.00),
  ('pingente-placa-sao-jorge-media', 35.00),
  ('regata-nba-lakers-kobe-bryant-preta', 179.90),
  ('retro-tailandesa-brasil-2006-azul-sem-nome', 179.90),
  ('retro-tailandesa-brasil-98-azul-sem-nome', 179.90),
  ('retro-tailandesa-corinthians-centenario', 179.90),
  ('retro-tailandesa-corinthians-japao', 179.90),
  ('retro-tailandesa-corinthians-suvinil', 179.90),
  ('pingente-placa-nossa-senhora-2cm', 25.00),
  ('retro-tailandesa-atletico-mineiro', 179.90),
  ('retro-tailandesa-corinthians-vermelha-sao-jorge', 179.90),
  ('retro-tailandesa-flamengo-azul', 179.90),
  ('retro-tailandesa-brasil-2002-sem-nome', 179.90),
  ('retro-tailandesa-barcelona-kluivert', 199.90),
  ('retro-tailandesa-sao-paulo-listrada', 179.90),
  ('retro-tailandesa-sao-paulo-branca-motorola', 179.90),
  ('retro-tailandesa-brasil-98-sem-nome', 179.90),
  ('retro-tailandesa-fiorentina', 179.90),
  ('retro-tailandesa-psg-cinza', 179.90),
  ('retro-tailandesa-brasil-94-sem-nome', 179.90),
  ('retro-tailandesa-brasil-ronaldo-2002-amarela', 199.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES
commit;
