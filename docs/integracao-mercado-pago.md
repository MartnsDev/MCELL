# Mercado Pago — Checkout Pro · Brasil · preferences · Node

## 1. Instalação

A stack existente utiliza HTTP `fetch` no servidor. A adaptação preserva esse cliente, sem introduzir um SDK redundante nem formulário local de cartão.

## 2. Credenciais

Configure `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `APP_URL` no servidor Next.js. Obtenha a credencial adequada no [painel de desenvolvedor](https://www.mercadopago.com.br/developers/panel/app). Use a conta e credenciais de teste correspondentes ao produto para a homologação. Credenciais da conta real podem gerar pagamentos reais; nenhum pagamento real foi gerado nesta implementação.

## 3. Servidor

`src/lib/commerce/payment.ts` monta a preferência a partir do pedido persistido. `src/app/api/commerce/[action]/route.ts` cria o checkout com referência externa do UUID interno e retorna `init_point`. Retorno automático é habilitado somente em origem HTTPS pública. A reserva e a chave de repetição são persistidas no banco antes da preferência. As chamadas enviam `X-Idempotency-Key`; a prevenção de uma segunda reserva é garantida pelo banco e não depende do provedor. Cobranças extras são sinalizadas para conciliação.

## 4. Cliente

O CTA do carrinho é marcado `data-mp-checkout-cta="checkout-pro"`. Mostra subtotal, frete e total e tem estados de processamento, erro e protocolo registrado. O usuário escolhe Pix ou cartão no checkout hospedado. A escolha efetiva depende dos meios habilitados na conta; a aplicação não registra número de cartão.

## 5. Webhook

Tópico `payment`. Endpoint `/api/payments/webhook`; HMAC-SHA256 e consulta do pagamento antes de qualquer confirmação. Eventos e mudanças de status são transacionais e idempotentes. A aplicação confirma recebimento somente após persistência: falhas devolvem erro para que o provedor entregue novamente. Essa escolha evita perda de evento em runtime sem fila durável. O webhook não usa tarefas assíncronas que possam ser encerradas depois da resposta.

## 6. Testes

Os testes locais cobrem assinatura válida/inválida/expirada, retorno local, valor persistido, notificação duplicada, valor incorreto e pagamento tardio/extra. Ainda é necessário testar um Pix e um cartão com as credenciais corretas, usando os [dados de teste oficiais](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integration-test/test-cards), e confirmar a entrega do webhook no painel. Não valide a integração com uma cobrança real.

## 7. Documentação

- [Preferências Checkout Pro](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/overview)
- [Criar preferência](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post)
- [Cotação de fretes Melhor Envio](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes)

## 8. Cuidados

Não usar recorrência, retorno do navegador como comprovante ou preço enviado pelo cliente. `init_point` é o endereço utilizado; Checkout Pro usa Preferences API. Atualize o domínio antigo em `APP_URL` e `NEXT_PUBLIC_APP_URL`. Configure o segredo do webhook do novo endpoint. Revise eventos tardios, estornos e chargebacks em `/admin/pagamentos`; estorno automático não está implementado. Não remova a integração antiga até conciliar assinaturas existentes.

## 9. Próximos passos de homologação

1. Verificar o webhook na conta e confirmar a assinatura com notificações reais de teste.
2. Preparar comprador e vendedor de teste e completar Pix/cartão conforme o produto.
3. Revisar a integração antes de habilitar vendas reais.

A skill `mercadopago:mp-integrate` e suas referências locais foram utilizadas. O MCP Mercado Pago não estava disponível; não houve operações externas na conta. O detector de CTA da skill falhou neste ambiente; o CTA foi conectado explicitamente ao checkout e validado pelos testes de navegador.
