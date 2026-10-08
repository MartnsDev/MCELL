-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('feminina-corinthians-branca-2025', 139.90),
  ('feminina-corinthians-preta-2025', 139.90),
  ('jogador-barcelona-preta', 179.90),
  ('jogador-flamengo-branca-2025', 179.90),
  ('jogador-flamengo-listrada-2025', 179.90),
  ('jogador-flamengo-preta-2024', 179.90),
  ('jogador-newcastle', 179.90),
  ('jogador-sao-paulo-listrada-2025', 179.90),
  ('jogador-palmeiras-branca-2025', 179.90),
  ('jogador-palmeiras-verde-2026', 179.90),
  ('jogador-real-madrid-detalhe-amarelo-2025', 179.90),
  ('kit-infantil-corinthians-branca-2025', 149.90),
  ('kit-infantil-vasco-preto-2024', 149.90),
  ('retro-tailandesa-barcelona-ronaldinho-listrada-azul', 199.90),
  ('retro-tailandesa-franca-zidane-98-azul', 199.90),
  ('retro-tailandesa-manchester-united-vermelha', 199.90),
  ('retro-tailandesa-santos-neymar-azul', 199.90),
  ('jogador-sao-paulo-branca-2024', 179.90),
  ('kit-infantil-real-madrid-detalhe-amarelo-2025', 149.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
