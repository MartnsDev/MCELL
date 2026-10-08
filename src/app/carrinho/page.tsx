import { catalog } from "@/lib/commerce/server";
import { Checkout } from "@/components/commerce/checkout";
export const metadata = {
  title: "Carrinho e checkout",
  robots: { index: false },
};
export default async function Page() {
  return (
    <main className="container section">
      <p className="eyebrow">SUA SELEÇÃO</p>
      <h1 style={{ marginBottom: 30 }}>Carrinho de compras</h1>
      <Checkout view={await catalog()} />
    </main>
  );
}
