import { Tracking } from "@/components/commerce/tracking";
import { catalog } from "@/lib/commerce/server";
export const metadata = {
  title: "Acompanhar conserto",
  robots: { index: false },
};
export default async function Page() {
  return (
    <main className="container section">
      <div className="narrow">
        <p className="eyebrow">ASSISTÊNCIA TÉCNICA</p>
        <h1>Acompanhe seu aparelho.</h1>
        <p>
          Consulte o protocolo, veja o diagnóstico e decida sobre seu orçamento.
        </p>
      </div>
      <Tracking kind="repair" settings={(await catalog()).settings} />
    </main>
  );
}
