import { catalog } from "@/lib/commerce/server";
export const metadata = { title: "Condições de assistência" };
export default async function Page() {
  const s = (await catalog()).settings;
  return (
    <main className="container section">
      <section className="narrow">
        <h1>Condições de assistência</h1>
        <p className="policy">
          {s.repair_terms ||
            "Estas informações estão em revisão pelo responsável da M'Cell. Consulte o atendimento antes de contratar."}
        </p>
      </section>
    </main>
  );
}
