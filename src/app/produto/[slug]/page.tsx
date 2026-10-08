import { notFound } from "next/navigation";
import Link from "next/link";
import { catalog } from "@/lib/commerce/server";
import { ProductDetail } from "@/components/commerce/product-detail";
import { ProductGrid } from "@/components/commerce/products";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const slug = (await params).slug;
  const product = (await catalog()).products.find((p) => p.slug === slug);
  return {
    title: product?.name ?? "Produto",
    description: product?.description.slice(0, 160),
  };
}
export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const view = await catalog();
  const p = view.products.find((p) => p.slug === slug);
  if (!p) notFound();
  const related = view.products
    .filter((x) => x.id !== p.id && x.category_id === p.category_id)
    .slice(0, 4);
  return (
    <main className="container section">
      <div className="breadcrumb">
        <Link href="/catalogo">Produtos</Link> / {p.name}
      </div>
      <ProductDetail product={p} settings={view.settings} />
      {related.length > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 25 }}>Também combina com sua rotina</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </main>
  );
}
