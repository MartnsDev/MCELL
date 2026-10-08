import type { Metadata } from "next";
import localFont from "next/font/local";
import { catalog } from "@/lib/commerce/server";
import { Header, Footer } from "@/components/commerce/shell";
import "./globals.css";
import "./storefront.css";
const storefrontFont = localFont({ src: "../../public/fonts/inter-variable.ttf", variable: "--font-storefront", display: "swap", weight: "100 900" });
const signatureFont = localFont({ src: "../../public/fonts/caveat-variable.ttf", variable: "--font-signature", display: "swap", weight: "400 700" });
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "M'Cell | Tecnologia e assistência técnica",
    template: "%s | M'Cell",
  },
  description:
    "Acessórios de celular, eletrônicos e assistência técnica. Escolha modelos compatíveis, consulte entrega e solicite seu orçamento.",
  icons: { icon: "/brand/mcell-m.svg" },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const view = await catalog();
  return (
    <html lang="pt-BR">
      <body className={`${storefrontFont.variable} ${signatureFont.variable}`}>
        <Header categories={view.categories} settings={view.settings} products={view.products} />
        <div id="conteudo">{children}</div>
        <Footer settings={view.settings} />
      </body>
    </html>
  );
}
