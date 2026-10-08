import Link from "next/link";
import { catalog } from "@/lib/commerce/server";
import { searchProduct, variantPrice } from "@/lib/commerce/cart";
import { ProductGrid } from "@/components/commerce/products";
export const metadata = { title: "Catálogo" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const read = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : "";
  const q = read("q").slice(0, 200),
    category = read("categoria"),
    brand = read("marca"),
    sort = read("ordem");
  const view = await catalog();
  const categoryId = view.categories.find((c) => c.slug === category)?.id;
  let products = view.products.filter(
    (p) =>
      (!category || p.category_id === categoryId) &&
      (!brand || p.brand === brand) &&
      searchProduct(p, q),
  );
  if (read("disponivel") === "1")
    products = products.filter((p) => p.variants.some((v) => v.stock > 0));
  const price = (p: (typeof products)[number]) =>
    Math.min(...p.variants.map(variantPrice));
  const min = Number(read("min")),
    max = Number(read("max"));
  if (min > 0)
    products = products.filter((p) => price(p) >= Math.round(min * 100));
  if (max > 0)
    products = products.filter((p) => price(p) <= Math.round(max * 100));
  if (sort === "menor-preco") products.sort((a, b) => price(a) - price(b));
  if (sort === "maior-preco") products.sort((a, b) => price(b) - price(a));
  if (sort === "disponibilidade")
    products.sort(
      (a, b) =>
        Number(b.variants.some((v) => v.stock > 0)) -
        Number(a.variants.some((v) => v.stock > 0)),
    );
  const pages = Math.max(1, Math.ceil(products.length / 12));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(read("pagina")) || 1),
  );
  const href = (n: number) => {
    const s = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v === "string" && k !== "pagina") s.set(k, v);
    });
    s.set("pagina", String(n));
    return "/catalogo?" + s;
  };
  return (
    <main className="container section">
      <p className="eyebrow">M&apos;Cell / PRODUTOS</p>
      <h1>Conecte sua rotina.</h1>
      <p>
        Acessórios e eletrônicos. Encontre a versão compatível com seu aparelho.
      </p>
      <div className="catalog-layout">
        <form className="filters" action="/catalogo">
          <label className="full">
            Buscar
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome, SKU ou aparelho"
            />
          </label>
          <label>
            Categoria
            <select name="categoria" defaultValue={category}>
              <option value="">Todas</option>
              {view.categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <select name="marca" defaultValue={brand}>
              <option value="">Todas</option>
              {[...new Set(view.products.map((p) => p.brand))]
                .filter(Boolean)
                .map((b) => (
                  <option key={b}>{b}</option>
                ))}
            </select>
          </label>
          <label>
            Ordenar
            <select name="ordem" defaultValue={sort}>
              <option value="novidades">Novidades</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
              <option value="disponibilidade">Disponibilidade</option>
            </select>
          </label>
          <label>
            Preço mínimo (R$)
            <input
              type="number"
              name="min"
              min="0"
              step="0.01"
              defaultValue={read("min")}
            />
          </label>
          <label>
            Preço máximo (R$)
            <input
              type="number"
              name="max"
              min="0"
              step="0.01"
              defaultValue={read("max")}
            />
          </label>
          <label>
            <input
              type="checkbox"
              name="disponivel"
              value="1"
              defaultChecked={read("disponivel") === "1"}
            />
            Só em estoque
          </label>
          <button>Aplicar filtros</button>
          <Link className="text-link" href="/catalogo">
            Limpar filtros
          </Link>
        </form>
        <div>
          <p>{products.length} produto(s) encontrado(s)</p>
          {products.length ? (
            <ProductGrid
              products={products.slice((page - 1) * 12, page * 12)}
            />
          ) : (
            <div className="panel">
              <h2>
                {view.unavailable
                  ? "Catálogo indisponível"
                  : "Nenhum produto encontrado"}
              </h2>
              <p>
                {view.unavailable
                  ? "Tente novamente em instantes."
                  : "Novos produtos aparecerão aqui assim que forem cadastrados. Você também pode ajustar a busca."}
              </p>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Paginação">
              {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
              <span>
                {page} de {pages}
              </span>
              {page < pages && <Link href={href(page + 1)}>Próxima</Link>}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
