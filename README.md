# M'Cell

Loja de acessórios e eletrônicos com catálogo público, variações com estoque, checkout, SEDEX/retirada e assistência técnica com protocolo e aprovação de orçamento. Next.js 16, React 19, TypeScript, Tailwind 4, Supabase e Mercado Pago Checkout Pro.

O catálogo inicia vazio. Não há produtos, preços, vendas ou endereços inventados em produção. As categorias e tipos de serviços iniciais são sugestões editáveis. O banco antigo não foi alterado remotamente.

## Instalação

Use **Node 22 ou superior**, npm e um projeto Supabase.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Preencha o arquivo copiado com as credenciais do seu ambiente; não sobrescreva um `.env.local` existente sem preservá-lo. `npm run build` usa Webpack, suportado pelo Next.js instalado, pois o Turbopack não conseguia abrir sua porta auxiliar no ambiente de execução desta revisão.

## Banco e migração

A auditoria e o plano de reversão estão em [docs/auditoria-migracao.md](docs/auditoria-migracao.md). A nova migração é [0013_martins_cell.sql](supabase/migrations/0013_martins_cell.sql).

Em banco que já recebeu 0001–0012, aplique **somente 0013**, depois de backup e ensaio em homologação. Em projeto novo, aplique as migrações versionadas em ordem. Use o Supabase CLI ou SQL Editor com acesso administrativo. Não execute o script de testes contra produção: ele cria seu próprio PostgreSQL descartável no `/tmp`.

Nenhuma tabela ou linha anterior é apagada. Os IDs e lojas anteriores permanecem no banco; o novo domínio usa tabelas `mc_*` independentes. Os arquivos visuais antigos estão em `docs/legacy-assets`, fora do diretório publicado, para reversão. As migrações históricas ainda são necessárias para reconstruir a base. A remoção definitiva das tabelas antigas requer inventário, backup e conciliação das assinaturas existentes.

As funções antigas de assinatura foram retiradas do código. Isso **não cancela assinaturas no Mercado Pago e não remove funções já publicadas no Supabase**. Concilie contratos e eventos pendentes antes de desativar os antigos endpoints e webhooks. Não publique essas funções novamente para a M'Cell.

## Autenticação e administrador

Mantenha o Google OAuth no Supabase, com as URLs de retorno `/auth/callback` do ambiente local e do domínio confirmado. O login não exige assinatura. Clientes podem comprar e solicitar assistência como visitantes.

A tabela `admin_users` existente continua sendo a autoridade. Para um ambiente novo, faça o login da conta responsável, confirme sua identidade e email, e cadastre seu UUID **manualmente pelo SQL Editor**:

```sql
insert into public.admin_users(user_id) values ('UUID_DA_CONTA_CONFIRMADA') on conflict do nothing;
```

Não existe promoção de usuário no frontend. Layout administrativo, cada endpoint e as funções de banco verificam autorização. Administradores podem acessar `/admin`.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública; `NEXT_PUBLIC_SUPABASE_ANON_KEY` é alternativa |
| `NEXT_PUBLIC_APP_URL` | URL deste site, usada também no sitemap; atualizar o domínio antigo |
| `SUPABASE_SERVICE_ROLE_KEY` | Segredo **do servidor** para pedidos, cotação e assistência |
| `APP_URL` | Origem deste site nos retornos e webhook do Mercado Pago; atualizar o domínio antigo |
| `MP_ACCESS_TOKEN` | Credencial de pagamento avulso do ambiente escolhido |
| `MP_WEBHOOK_SECRET` | Segredo de assinatura do webhook |
| `MELHOR_ENVIO_TOKEN` | Token do provedor de cotação de frete |
| `MELHOR_ENVIO_TEST_MODE` | `true` usa o ambiente de teste do Melhor Envio; produção exige `false` |
| `SHIPPING_CONTACT_EMAIL` | Email no User-Agent exigido pelo provedor |
| `CRON_SECRET` | Segredo longo para o job de expiração de reservas |
| `TRUST_PROXY_IP` | `true` somente atrás de proxy que sobrescreve `x-forwarded-for` |

Não coloque segredos em variáveis `NEXT_PUBLIC_*`. As credenciais privadas existentes do Mercado Pago foram reaproveitadas no `.env.local` do servidor, sem revelar seus valores. As demais credenciais locais foram preservadas e não foram usadas para criar cobranças ou gravar no banco remoto. A presença do token antigo não homologa o novo fluxo de pagamentos.

## Primeira operação

1. Aplique a migração e configure o servidor, Google OAuth e a conta administrativa.
2. Em Configurações, confirme WhatsApp, email, endereço e horários. A retirada não pode ser ativada com endereço/horários vazios. O endereço só aparece quando a opção estiver ativada.
3. Configure CEP de origem, embalagem e token de frete; ative envio somente depois de uma cotação real em homologação.
4. Cadastre categorias e produtos em `/admin/produtos`. Um produto pode ter várias versões existentes, cada uma com SKU único, atributos, preço, promoção, custo privado, estoque, peso e dimensões.
5. Envie imagens pelo painel. Elas são verificadas, decodificadas, limitadas a 20 milhões de pixels, reduzidas a até 2200 px e convertidas para WebP sem metadados. Selecione a imagem principal e a imagem de cada versão.
6. Publique o produto. Ative destaques e escolha quais seções da página inicial aparecem nas configurações. Novidades seguem a data de cadastro; mais vendidos usam somente quantidades de pedidos confirmados.
7. Confirme as políticas comerciais e os termos de assistência antes de ativar solicitações públicas. Há um rascunho operacional em [docs/termos-assistencia-rascunho.md](docs/termos-assistencia-rascunho.md).

Categorias vazias não geram vitrines falsas. O catálogo oferece busca por nome, SKU, marca, tipo, atributos e compatibilidade, filtros de categoria/marca/disponibilidade/preço, ordenação e paginação. Produtos esgotados são identificados; versões esgotadas não podem ser selecionadas para compra.

## Carrinho, entrega e pedidos

O carrinho persiste somente IDs de variação e quantidades no navegador. Produtos, estoque, pedidos, cotação, pagamentos e assistência ficam no PostgreSQL. Preços e totais usam centavos inteiros. O subtotal informado pelo cliente é usado apenas para detectar mudança de preço; o valor cobrado é recalculado pelo banco.

O servidor recalcula o pedido e o banco reserva o estoque na mesma transação, impedindo compras simultâneas da última unidade. Uma chave persistida de tentativa impede uma segunda reserva em repetições. Preços, descontos e frete do navegador não são aceitos. Fotos, SKUs e preços são registrados no snapshot do pedido.

Retirada tem frete zero e não exige endereço de entrega. SEDEX usa a API do Melhor Envio com CEPs, peso, dimensões e embalagem. A interface `ShippingProvider` permite substituição futura. O pacote usa empilhamento conservador e recusa volumes fora dos limites configurados para cotação manual. A cotação expira em 10 minutos e o banco compara quantidade, preço e dimensões atuais antes de aceitar o frete. Sem credencial ou com erro do provedor, o estado é de indisponibilidade e há consulta manual pelo WhatsApp; nenhuma taxa fictícia é mostrada.

As etiquetas são adquiridas no painel do provedor e seus rastreios registrados na administração. **Compra automática de etiquetas, integração fiscal e acompanhamento automático de eventos dos Correios não estão implementados**. Os códigos e estados de envio são atualizados pelo responsável.

Estados: aguardando pagamento, pago, preparação, pronto para retirada, enviado, entregue e cancelado. Só o servidor confirma Mercado Pago; administradores podem confirmar recebimento de pagamento a combinar, se habilitado, com auditoria. Pedidos pagos não podem ser cancelados pelo fluxo simples: conciliação e estorno devem ocorrer no provedor.

Uma tentativa de pedido interrompida pode ser retomada na mesma aba usando a chave de tentativa mantida na sessão do navegador. O cliente recebe protocolo e chave privada; o navegador guarda a última chave como conveniência. A chave de 256 bits é armazenada como SHA-256 no banco e validada no servidor. A perda da chave exige atendimento e verificação de identidade; não há recuperação automática por email. Não envie a chave pelo WhatsApp.

### Expiração de estoque

Agende **a cada minuto** um POST autenticado para `/api/cron/expire`:

```sh
curl -X POST https://SEU_DOMINIO/api/cron/expire -H "Authorization: Bearer SEU_CRON_SECRET"
```

Não coloque o segredo em URL. Hospedagens com cron exclusivamente GET devem usar um job externo que faça POST. Reservas de produtos por Mercado Pago duram 30 minutos; pagamento a combinar e serviço duram 24 horas. O job restaura estoque uma única vez para reservas vencidas. **Configure e monitore esse job antes de vender.** Limpe periodicamente cotações vencidas e contadores antigos, respeitando as referências de pedidos e sua política de retenção.

## Pagamento avulso

Checkout Pro cria `/checkout/preferences`, com referência ao pedido persistido, valor validado, vencimento e `init_point`. Pix e cartão são selecionados no checkout hospedado conforme a disponibilidade da conta. Não há formulário de cartão local nem recorrência.

Configure notificações de **payment** no painel Mercado Pago para:

`https://SEU_DOMINIO/api/payments/webhook`

O endpoint valida HMAC-SHA256, request ID e timestamp, consulta `/v1/payments/{id}` e confere referência, BRL e valor. A transação registra os eventos idempotentemente. Retornos do navegador não alteram status. Erros de provedor/banco não recebem sucesso falso, permitindo nova entrega. Confirmações repetidas não debitam estoque. Pagamentos após cancelamento, cobranças extras, estornos e chargebacks são registrados para revisão; não há estorno automático.

Se a criação do checkout falhar após a reserva, o protocolo permanece disponível e o cliente pode tentar novamente em `/pedidos`. Consulte [docs/integracao-mercado-pago.md](docs/integracao-mercado-pago.md).

## Assistência técnica

O formulário reúne cliente, serviço, aparelho, defeito, modalidade, fotos opcionais e aceite dos termos atuais; não coleta senha de desbloqueio. Termos e serviço precisam estar ativos. Fotos ficam em bucket privado e são lidas com URLs assinadas curtas.

Para atendimento à distância, o responsável autoriza envio e registra instruções, entrada, rastreio, diagnóstico, orçamento, frete de retorno e prazo. O cliente consulta com protocolo/chave e aprova ou recusa **a versão atual** do orçamento. Uma mudança de valores ou diagnóstico invalida a aprovação e cancela cobranças ainda pendentes; uma alteração após pagamento exige conciliação.

O banco impede início do reparo sem aprovação. A administração registra testes e rastreio de devolução, histórico público ou interno e fotos técnicas. O cliente só lê atualizações públicas; nome, telefone e endereço não são enviados na consulta pública. Fotos técnicas registradas são visíveis ao cliente: mantenha anotações sensíveis no histórico interno.

Estados cobrem solicitação, autorização de envio, recebimento, diagnóstico, aprovação, reparo, testes, retirada/postagem, envio, conclusão, recusa e impossibilidade de reparo. Dispositivos recusados ou inviáveis podem ser devolvidos sem autorização de reparo. O serviço aprovado e o frete de retorno podem gerar pedido avulso de pagamento, reutilizando o mesmo checkout e webhook.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run test:security:db
npm run build
```

Os testes SQL incluem migrações completas, RLS, gravação administrativa, reserva, simultaneidade em duas conexões, repetição, preço calculado, frete, cotação vencida/alterada, pagamento duplicado/incompatível, expiração, autorização de assistência, recusa, identidade e cobrança do orçamento aprovado. Exigem PostgreSQL local (`pg_config`, `initdb`, `pg_ctl`, `psql`). Não usam o Supabase remoto.

Para os testes visuais isolados, consulte [docs/testes-navegador.md](docs/testes-navegador.md). Os fixtures só vivem em `scripts/mock-catalog.mjs` e não são importados pela aplicação.

## Publicação e validação manual

Use hospedagem com runtime Node 22 e suporte completo a Next.js; não exporte este projeto como site estático. Aplique a migração antes da nova aplicação. Configure variáveis **antes do build**, principalmente `NEXT_PUBLIC_*`. Execute build de produção novamente depois de testes com banco simulado.

Antes do uso comercial, ainda é necessário confirmar no ambiente real: OAuth Google, leitura/gravação e RLS do Supabase, upload nos buckets, cotações reais de SEDEX, Pix/cartão com credenciais de teste, webhook duplicado e pagamento tardio, job de expiração, rastreios, termos comerciais, garantia, políticas de devolução e endereço. O código foi testado isoladamente; isso não equivale a homologação da conta do provedor nem a publicação.

As mudanças estão no workspace, sem commit ou deploy. A migração não foi aplicada remotamente e nenhuma cobrança foi realizada. A arquitetura está implementada, mas a operação real depende destas configurações e homologação.

A identidade visual baseada na referência, os arquivos de imagem e as licenças das fontes estão documentados em [docs/identidade-visual.md](docs/identidade-visual.md).

O repositório público contém `data/catalog/products.json`, uma cópia somente dos dados de venda e estoque para exibir os produtos enquanto o banco não estiver configurado. Custos de compra, arquivos de contas e importações privadas ficam fora do Git. Consulte [docs/catalogo-publico.md](docs/catalogo-publico.md).
