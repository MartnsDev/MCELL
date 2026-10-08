import { catalog } from "@/lib/commerce/server";
import { Favorites } from "@/components/commerce/favorites";
export const metadata = { title: "Favoritos" };
export default async function Page() {
  const { products } = await catalog();
  return <main className="container section"><h1>Meus favoritos</h1><Favorites products={products} /></main>;
}
