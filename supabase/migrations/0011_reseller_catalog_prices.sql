-- Catalog update: preserve all shops and their individual prices.
begin;

-- BEGIN GENERATED CATALOG PRICES
insert into public.reseller_catalog_prices (product_id, base_price) values
  ('psg-jogador-2023', 179.90),
  ('bone-brasil-preto', 69.90),
  ('bone-bayern-preto-patrocinio', 69.90),
  ('cropped-brasil-azul-bordado', 69.90),
  ('cropped-brasil-verde-bordado', 69.90),
  ('kit-treino-flamengo-cinza', 149.90),
  ('kit-treino-tottenham', 179.90),
  ('palmeiras-branca-manga-longa', 149.90),
  ('retro-tailandesa-inglaterra-beckham', 199.90),
  ('retro-tailandesa-arsenal-henry', 199.90),
  ('infantil-feminina-nacional-premium-brasil-gola-preta', 85.90),
  ('infantil-feminina-nacional-premium-flamengo-branca-2023', 69.90),
  ('infantil-feminina-nacional-premium-palmeiras-branca-2025', 85.90),
  ('nacional-premium-alemanha-azul', 85.90),
  ('nacional-premium-corinthians-branca-2026', 85.90),
  ('nacional-premium-palmeiras-branca-2024', 85.90),
  ('nacional-premium-santos-branca-retro', 85.90),
  ('nacional-premium-santos-neymar-preta', 85.90),
  ('nacional-premium-flamengo-bege', 85.90),
  ('nacional-premium-flamengo-preta', 85.90),
  ('nacional-premium-mexico-preta', 85.90),
  ('nacional-premium-retro-manchester-united-ronaldo-azul', 85.90),
  ('nacional-premium-santos-neymar-branca', 85.90)
on conflict (product_id) do update set base_price = excluded.base_price;
-- END GENERATED CATALOG PRICES

commit;
