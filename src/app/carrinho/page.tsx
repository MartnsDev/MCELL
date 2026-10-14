import { catalog } from "@/lib/commerce/server";
import { WhatsAppCheckout } from "@/components/commerce/whatsapp-checkout";
export const metadata = {
  title: "Carrinho e pedido pelo WhatsApp",
  robots: { index: false },
};
export default async function Page() {
  return (
    <main className="container section">
      <p className="eyebrow">SUA SELEÇÃO</p>
      <h1 style={{ marginBottom: 30 }}>Carrinho de compras</h1>
      <WhatsAppCheckout view={await catalog()} />
    </main>
  );
}
