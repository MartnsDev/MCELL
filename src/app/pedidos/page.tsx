import { Tracking } from "@/components/commerce/tracking";
import { catalog } from "@/lib/commerce/server";
export const metadata = {
  title: "Acompanhar pedido",
  robots: { index: false },
};
export default async function Page() {
  return (
    <main className="container section">
      <div className="narrow">
        <p className="eyebrow">SEU PEDIDO</p>
        <h1>Da loja até você.</h1>
        <p>
          Use o protocolo e sua chave privada para consultar pagamento,
          preparação e entrega.
        </p>
      </div>
      <Tracking kind="order" settings={(await catalog()).settings} />
    </main>
  );
}
