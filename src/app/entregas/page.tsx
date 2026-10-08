import { catalog } from "@/lib/commerce/server";
export const metadata = { title: "Entregas e retirada" };
export default async function Page() {
  const s = (await catalog()).settings;
  return (
    <main className="container section">
      <section className="narrow">
        <h1>Entregas e retirada</h1>
        <p className="policy">
          {s.delivery_policy ||
            "Estas informações estão em revisão pelo responsável da M'Cell. Consulte o atendimento antes de contratar."}
        </p>
      </section>
    </main>
  );
}
