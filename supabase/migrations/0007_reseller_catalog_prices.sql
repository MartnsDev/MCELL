-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('nacional-premium-corinthians-all-black', 85.90),
  ('nacional-premium-corinthians-branca-2025', 85.90),
  ('nacional-premium-corinthians-branca-dourada', 85.90),
  ('nacional-premium-corinthians-listrada-2026', 85.90),
  ('nacional-premium-corinthians-preta-2025', 85.90),
  ('nacional-premium-corinthians-preta-dourada', 85.90),
  ('nacional-premium-corinthians-preta-letras', 85.90),
  ('nacional-premium-corinthians-roxa', 85.90),
  ('nacional-premium-alemanha-branca', 85.90),
  ('nacional-premium-arsenal-vermelha', 85.90),
  ('nacional-premium-bahia-branca', 85.90),
  ('nacional-premium-bahia-listrada', 85.90),
  ('nacional-premium-barcelona-preta-azul', 85.90),
  ('nacional-premium-bayern-vermelha', 85.90),
  ('nacional-premium-chelsea-branca', 85.90),
  ('jogador-corinthians-branca-2025', 179.90),
  ('jogador-corinthians-preta-laranja', 199.90),
  ('retro-tailandesa-milan-kaka-listrada', 199.90),
  ('retro-tailandesa-real-madrid-ronaldo-9', 199.90),
  ('retro-tailandesa-real-madrid-ronaldo-branca-azul', 199.90),
  ('retro-tailandesa-santos-neymar-listrada', 199.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
