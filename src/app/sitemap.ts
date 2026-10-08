import type { MetadataRoute } from "next";
import { catalog } from "@/lib/commerce/server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const view = await catalog();
  return [
    { url: base },
    { url: `${base}/catalogo` },
    { url: `${base}/assistencia` },
    ...view.products.map((p) => ({
      url: `${base}/produto/${p.slug}`,
      lastModified: new Date(p.created_at),
    })),
  ];
}
