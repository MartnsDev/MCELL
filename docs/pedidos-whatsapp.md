# Pedidos manuais pelo WhatsApp

O carrinho público monta uma solicitação de compra, sem criar `mc_orders`, cobrar ou reservar estoque. O fluxo online anterior e os protocolos existentes continuam preservados no código e no banco.

O cliente escolhe quantidades nos cards, informa nome ou razão social/CNPJ e endereço completo de entrega. O CEP consulta o ViaCEP pelo servidor; quando indisponível, todos os campos continuam editáveis. Dados pessoais do formulário não são persistidos no localStorage; o carrinho continua contendo apenas IDs e quantidades. A consulta do CEP envia somente o CEP ao provedor.

`POST /api/commerce/whatsapp-order` exige mesma origem, aplica o limitador existente e valida o corpo. Recebe somente IDs/quantidades e dados de entrega. Consulta o catálogo atual, valida disponibilidade e recalcula o subtotal em centavos; não aceita preços do navegador nem expõe custos. Retorna um link `https://wa.me/` com o resumo. O cliente ainda precisa enviar a mensagem no WhatsApp. O carrinho não é apagado ao abrir o link.

O subtotal exclui frete. Disponibilidade, valor do frete e pagamento são confirmados manualmente na conversa. A mensagem pode ser editada no WhatsApp e não constitui confirmação de pedido ou pagamento. Estoques não são decrementados pelo envio; o responsável atualiza o estoque no painel após combinar a venda.

O destino vem exclusivamente de `mc_settings.whatsapp`, configurável em `/admin/configuracoes`, com código do país e DDD, apenas números. Não há destinatário de exemplo ou fallback. Sem número configurado, o botão fica indisponível com uma explicação; o endpoint também bloqueia a geração do link.

CNPJ aceita formato numérico ou alfanumérico, normalizando pontuação. A validação verifica formato, não consulta o cadastro da empresa. Não é solicitado CPF.

Referências: [ViaCEP](https://viacep.com.br/) e [CNPJ alfanumérico — Receita Federal](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).
