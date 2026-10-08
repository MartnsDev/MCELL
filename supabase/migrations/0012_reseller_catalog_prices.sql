-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('jogador-palmeiras-azul-2026', 169.90),
  ('jogador-franca-azul', 199.90),
  ('jogador-brasil-amarela-1-1', 179.90),
  ('jogador-barcelona-2024', 179.90),
  ('jogador-brasil-amarela', 179.90),
  ('jogador-argentina-2022', 179.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
