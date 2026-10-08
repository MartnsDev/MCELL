import { catalog } from "@/lib/commerce/server";
export const metadata = { title: "Sobre a M'Cell" };
export default async function Page() {
  const { settings } = await catalog();
  return <main className="container section"><h1>Sobre a M&apos;Cell</h1><p>{settings.about || "Acessórios, eletrônicos e assistência técnica em um só lugar. Qualidade, variedade e atendimento para o seu dia a dia."}</p></main>;
}
