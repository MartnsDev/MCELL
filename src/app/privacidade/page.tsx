import { catalog } from "@/lib/commerce/server";
export const metadata = { title: "Privacidade" };
export default async function Page() {
  const s = (await catalog()).settings;
  return (
    <main className="container section">
      <section className="narrow">
        <h1>Privacidade</h1>
        <p className="policy">
          {s.privacy_policy ||
            "Estas informações estão em revisão pelo responsável da M'Cell. Consulte o atendimento antes de contratar."}
        </p>
      </section>
    </main>
  );
}
