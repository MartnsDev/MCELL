# Auditoria e plano M'Cell

Stack: Next.js 16.3.6 App Router, React 19, TypeScript, Tailwind 4, Supabase Postgres/Auth/Storage, Zustand, Zod e Vitest. Login OAuth Google via PKCE e cookies SSR. Autorização administrativa via `admin_users` e `is_admin()` no servidor.

Anterior: catálogo de camisas em código, lojas de revendedores, destaques próprios, preços derivados de custos, carrinho WhatsApp, assinaturas Mercado Pago `/preapproval` e domínios separados. Estes fluxos não são adequados ao varejo de eletrônicos.

Reaproveitar: framework, autenticação, RLS, proteção administrativa, cabeçalhos de segurança, infraestrutura Supabase e ferramentas de teste. Substituir: apresentações, catálogo estático, assinatura, revenda, desconto de camisas, domínios e rotas exclusivas do antigo produto.

A migração 0013 cria tabelas `mc_*` independentes. Nenhuma tabela ou linha anterior é apagada; os identificadores antigos permanecem intactos. As migrações históricas são necessárias para reconstrução e reversão, e não são reescritas. Código anterior pode ser recuperado pelo Git. Não executar rollback apagando pedidos reais. Para reverter, restaurar a versão anterior e desativar as novas rotas mantendo o banco para conciliação. A remoção futura de tabelas antigas exige backup, inventário de assinaturas ainda ativas e aprovação operacional.

Etapas: domínio e persistência → catálogo público e administração → carrinho, cotação e checkout transacional → pagamentos assinados e idempotentes → assistência e aprovação → testes isolados, compilação e documentação.

Credenciais locais foram verificadas apenas quanto à presença. Nenhum segredo integra esta auditoria. Não foram realizadas gravações no Supabase remoto, cobranças, cancelamento de assinaturas ou publicação. Antes de trocar o domínio público, conciliar e encerrar assinaturas antigas pelo provedor; remover os antigos webhooks e funções após essa conciliação.

Referência de UX: https://pmcellsaopaulo.com.br/ e suas coleções; busca por código/modelo, categorias, variantes e resumo do carrinho. Sem copiar identidade, textos ou imagens; varejo sem pedido mínimo.

Inventário analisado:

- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/components/admin-shell.tsx`
- `src/components/shop-test-access.test.tsx`
- `src/components/shop-setup-demo.tsx`
- `src/components/product-quality-badge.tsx`
- `src/components/logo.tsx`
- `src/components/brand.tsx`
- `src/components/shop-featured-editor.tsx`
- `src/components/resale-preview.tsx`
- `src/components/switch-account.tsx`
- `src/components/reseller-pitch.tsx`
- `src/components/subscription-offer.tsx`
- `src/components/shop-test-access.tsx`
- `src/components/member-nav.tsx`
- `src/components/product-detail.tsx`
- `src/components/reseller-storefront.tsx`
- `src/components/catalog.tsx`
- `src/lib/subscription.test.ts`
- `src/lib/home-collections.ts`
- `src/lib/supabase-config.ts`
- `src/lib/order-notices.ts`
- `src/lib/product-availability.test.ts`
- `src/lib/request-origin.ts`
- `src/lib/product-quality.ts`
- `src/lib/subscription.ts`
- `src/lib/whatsapp.ts`
- `src/lib/payment-webhook.test.ts`
- `src/lib/cart-pricing.ts`
- `src/lib/product-availability.ts`
- `src/lib/shop-login-return.ts`
- `src/lib/personalization.test.ts`
- `src/lib/cart-pricing.test.ts`
- `src/lib/cart-store.ts`
- `src/lib/demo-data.test.ts`
- `src/lib/demo-data.ts`
- `src/lib/product-quality.test.ts`
- `src/lib/supabase.ts`
- `src/lib/whatsapp.test.ts`
- `src/lib/personalization-options.ts`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/lib/shops/ordering.test.ts`
- `src/lib/shops/public.ts`
- `src/lib/shops/ordering.ts`
- `src/lib/shops/orders.ts`
- `src/lib/shops/links.test.ts`
- `src/lib/shops/catalog.test.ts`
- `src/lib/shops/catalog.ts`
- `src/lib/shops/orders.test.ts`
- `src/lib/shops/unavailable.ts`
- `src/lib/shops/metadata.test.ts`
- `src/lib/shops/metadata.ts`
- `src/lib/shops/links.ts`
- `src/lib/shops/settings.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/layout.test.ts`
- `src/app/admin/layout.tsx`
- `src/app/admin/dashboard.tsx`
- `src/app/assinar/page.tsx`
- `src/app/catalogo/page.tsx`
- `src/app/produto/produto-client.tsx`
- `src/app/produto/page.tsx`
- `src/app/entrar/page.tsx`
- `src/app/privacidade/page.tsx`
- `src/app/carrinho/page.tsx`
- `src/app/minhaloja/page.tsx`
- `src/app/conta/page.tsx`
- `src/app/loja/layout.tsx`
- `src/app/loja/not-found.tsx`
- `src/app/termos/page.tsx`
- `src/app/catalogo-digital/page.tsx`
- `src/app/assinatura/confirmacao/page.tsx`
- `src/app/admin/configuracoes/page.tsx`
- `src/app/admin/assinantes/page.tsx`
- `src/app/admin/produtos/page.tsx`
- `src/app/minhaloja/1831825277/page.tsx`
- `src/app/minhaloja/[storeId]/page.tsx`
- `src/app/api/loja/[slug]/pedido/route.test.ts`
- `src/app/api/loja/[slug]/pedido/route.ts`
- `src/app/loja/[slug]/page.tsx`
- `src/app/auth/callback/route.test.ts`
- `src/app/auth/callback/route.ts`
- `supabase/.env.example`
- `supabase/.env.local`
- `supabase/config.toml`
- `supabase/migrations/0005_security_hardening.sql`
- `supabase/migrations/0010_reseller_catalog_prices.sql`
- `supabase/migrations/0006_reseller_test_access.sql`
- `supabase/migrations/0003_reseller_test_shops.sql`
- `supabase/migrations/0002_subscription_checkout.sql`
- `supabase/migrations/0012_reseller_catalog_prices.sql`
- `supabase/migrations/0001_gm_black_sports.sql`
- `supabase/migrations/0011_reseller_catalog_prices.sql`
- `supabase/migrations/0004_reseller_storefront_highlights.sql`
- `supabase/migrations/0007_reseller_catalog_prices.sql`
- `supabase/migrations/0009_reseller_catalog_prices.sql`
- `supabase/migrations/0008_reseller_catalog_prices.sql`
- `supabase/functions/subscription-flow.test.ts`
- `supabase/functions/subscription-reconciliation.test.ts`
- `supabase/tests/reseller_test_access.sql`
- `supabase/tests/reseller_highlights.sql`
- `supabase/tests/reseller_shops.sql`
- `supabase/tests/security.sql`
- `supabase/.temp/linked-project.json`
- `supabase/.temp/cli-latest`
- `supabase/functions/manage-subscription/index.ts`
- `supabase/functions/create-subscription/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`
- `supabase/functions/_shared/webhook-signature.ts`
- `supabase/functions/_shared/mercadopago.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/subscription-policy.ts`
- `supabase/functions/_shared/supabase.ts`
- `supabase/functions/bootstrap-admin/index.ts`
- `scripts/test-reseller-permissions.sh`
- `scripts/refresh-reseller-price-seed.test.mjs`
- `scripts/refresh-reseller-price-seed.cjs`
- `docs/login-google-supabase.md`
- `docs/seguranca-lancamento.md`
- `docs/pagamentos-mercado-pago.md`
- `docs/dominio-dos-catalogos.md`
- `docs/loja-teste.md`