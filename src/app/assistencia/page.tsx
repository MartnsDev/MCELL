import Link from "next/link";
import { catalog } from "@/lib/commerce/server";
import { RepairForm } from "@/components/commerce/repair-form";
export const metadata = { title: "Assistência técnica" };
export default async function Page() {
  const view = await catalog();
  return (
    <main className="container section">
      <p className="eyebrow">M&apos;Cell / ASSISTÊNCIA</p>
      <h1>Vamos cuidar do seu aparelho.</h1>
      <p>
        Solicite um diagnóstico, acompanhe cada etapa e aprove seu orçamento
        antes do conserto.
      </p>
      <div className="cart-layout subsection">
        <div>
          <div className="panel">
            <h2>Como funciona</h2>
            <ol>
              <li>Descreva o defeito e receba seu protocolo.</li>
              <li>
                Aguarde as instruções de atendimento ou autorização de postagem.
              </li>
              <li>Após o diagnóstico, confira o valor e o prazo.</li>
              <li>Aprove ou recuse o orçamento com sua chave privada.</li>
              <li>Acompanhe os testes, retirada ou devolução.</li>
            </ol>
            <p>
              Envie seu aparelho somente após autorização. O frete de retorno e
              as condições de diagnóstico serão informados antes da sua decisão.
            </p>
            <Link className="button secondary" href="/assistencia/acompanhar">
              Já tenho um protocolo
            </Link>
          </div>
          <section className="subsection">
            <h2>Serviços</h2>
            {view.services.map((s) => (
              <div key={s.id} className="cart-row">
                <div>
                  <h3>{s.name}</h3>
                  {s.description && <p>{s.description}</p>}
                  <small>Orçamento após avaliação</small>
                </div>
              </div>
            ))}
          </section>
        </div>
        <RepairForm settings={view.settings} services={view.services} />
      </div>
    </main>
  );
}
