import { catalog } from "@/lib/commerce/server";
export const metadata = { title: "Privacidade" };
export default async function Page() {
  const s = (await catalog()).settings;
  return (
    <main className="container section">
      <section className="narrow">
        <h1>Privacidade</h1>
        <p className="policy">
          {s.privacy_policy ||
            "Estas informações estão em revisão pelo responsável da M'Cell. Consulte o atendimento antes de contratar."}
        </p>
        <h2>Pedidos pelo WhatsApp</h2>
        <p>Ao preparar um pedido, seu nome ou razão social, CNPJ quando informado, endereço de entrega e itens são usados para montar o resumo. O site confere os itens e valores sem registrar um pedido ou reservar estoque. Esses dados pessoais não são salvos no carrinho do navegador.</p>
        <p>A consulta automática de endereço envia somente o CEP ao ViaCEP. Ao abrir o WhatsApp e enviar a mensagem, o resumo e os dados de entrega são compartilhados com a M’Cell pelo WhatsApp, para combinar disponibilidade, frete e pagamento.</p>
      </section>
    </main>
  );
}
