-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('infantil-feminina-nacional-premium-brasil-branca-polo', 89.90),
  ('infantil-feminina-nacional-premium-corinthians-all-black', 85.90),
  ('infantil-feminina-nacional-premium-corinthians-listrada-2023', 85.90),
  ('infantil-feminina-nacional-premium-flamengo-2023', 85.90),
  ('infantil-feminina-nacional-premium-al-hilal-branca', 69.90),
  ('infantil-feminina-nacional-premium-al-hilal-azul', 69.90),
  ('nacional-premium-flamengo-2023', 69.90),
  ('infantil-feminina-nacional-premium-real-madrid-bellingham', 69.90),
  ('infantil-feminina-nacional-premium-sao-paulo-listrada-2025', 85.90),
  ('infantil-feminina-nacional-premium-psg', 85.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
