-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('jogador-corinthians-preta-2025', 199.90),
  ('jogador-flamengo-bege-1981', 179.90),
  ('jogador-palmeiras-amarela', 179.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
