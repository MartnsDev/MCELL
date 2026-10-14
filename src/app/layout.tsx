import type { Metadata } from "next";
import localFont from "next/font/local";
import { catalog } from "@/lib/commerce/server";
import { Header, Footer } from "@/components/commerce/shell";
import "./globals.css";
import "./storefront.css";
import "./refinement.css";
import "./admin.css";
const storefrontFont = localFont({ src: "../../public/fonts/inter-variable.ttf", variable: "--font-storefront", display: "swap", weight: "100 900" });
const signatureFont = localFont({ src: "../../public/fonts/caveat-variable.ttf", variable: "--font-signature", display: "swap", weight: "400 700" });
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "M'Cell | Conserto de celulares",
    template: "%s | M'Cell",
  },
  description:
    "Conserto de celulares e assistência técnica na M’Cell. Solicite um orçamento, aprove o reparo e acompanhe seu aparelho. Acessórios para complementar o cuidado.",
  icons: { icon: [{ url: "/brand/favicon-mcell.svg", type: "image/svg+xml" }], apple: "/logo-mcell.png" },
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
