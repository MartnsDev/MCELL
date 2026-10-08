# Testes de navegador isolados

O navegador integrado não estava disponível na sessão; os testes usam Playwright e o Chrome instalado. Ajuste `executablePath` em `scripts/browser-smoke.mjs` se o Chrome estiver em outro local. Não usam sessões pessoais ou dados reais.

Os valores públicos do Next.js são incorporados no build. Um servidor inicializado com variáveis diferentes de um build anterior não é suficiente: compile também com o ambiente isolado.

Em um terminal:

```sh
node scripts/mock-catalog.mjs
```

Em outro, compile e inicie somente o ambiente isolado:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3111 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-public-key NEXT_PUBLIC_SUPABASE_ANON_KEY= NEXT_PUBLIC_APP_URL=http://127.0.0.1:3110 SUPABASE_SERVICE_ROLE_KEY=test-private-key MP_ACCESS_TOKEN= MP_WEBHOOK_SECRET= APP_URL=http://127.0.0.1:3110 npm run build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3111 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-public-key NEXT_PUBLIC_SUPABASE_ANON_KEY= NEXT_PUBLIC_APP_URL=http://127.0.0.1:3110 SUPABASE_SERVICE_ROLE_KEY=test-private-key MP_ACCESS_TOKEN= MP_WEBHOOK_SECRET= APP_URL=http://127.0.0.1:3110 npm start -- --hostname 127.0.0.1 --port 3110
```

Execute:

```sh
npm run test:browser
```

O teste verifica homepage sem mais vendidos fictícios, overflow horizontal, favoritos persistidos e sua remoção, total real do carrinho no cabeçalho, busca por SKU, seleção e bloqueio de variações, carrinho após reload, retirada sem endereço, formulário de envio, erro de cotação, checkout com valores do servidor, protocolo de assistência e bloqueio administrativo. Intercepta as operações de checkout e assistência exclusivamente dentro do contexto do navegador de teste. Os testes de persistência e concorrência verdadeiros estão no PostgreSQL descartável (`npm run test:security:db`).

Imagens de revisão ficam em `/tmp/martins-cell-browser`, nas larguras 1440 e 390 px. Ao concluir, pare os dois servidores e execute **`npm run build` sem os valores de teste** antes de iniciar ou publicar a loja real. O catálogo de teste não integra o código da aplicação.
