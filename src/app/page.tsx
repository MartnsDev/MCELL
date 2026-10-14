import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, ClipboardList, BadgeDollarSign, Settings2, Package } from "lucide-react";
import { catalog } from "@/lib/commerce/server";
import { Benefits, BudgetLink, HeroBenefits } from "@/components/commerce/shell";
import { StorefrontProduct } from "@/components/commerce/storefront-products";
import { emptySettings } from "@/lib/commerce/types";
const categoryTiles = [
  ["Capinhas", "capinhas"], ["Películas", "peliculas"], ["Cabos", "cabos"], ["Carregadores", "carregadores"],
  ["Fones", "fones"], ["Suportes", "suportes"], ["Smartwatch", "smartwatch"], ["Consertos", "consertos"],
];
export default async function Home() {
  const view = await catalog();
  const { products, settings: s } = view;
  const best = products.filter(p => (p.sold_count ?? 0) > 0).sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0)).slice(0, 8);
  const selection = best.length && s.home_show_bestsellers ? best : s.home_show_featured ? products.filter(p => p.featured).slice(0, 8) : s.home_show_new ? products.slice(0, 8) : [];
  const title = ["Tecnologia para o seu dia. Cuidado para o seu celular.", "Acessórios, eletrônicos e assistência técnica em um só lugar."].includes(s.hero_title) ? emptySettings.hero_title : s.hero_title;
  const heroText = ["Acessórios, eletrônicos e assistência técnica em um só lugar.", "Qualidade, variedade e o melhor atendimento para o seu dia a dia."].includes(s.hero_text) ? emptySettings.hero_text : s.hero_text;
  const serviceTitle = s.service_title === "Seu celular merece uma segunda chance." ? emptySettings.service_title : s.service_title;
  const serviceText = s.service_text === "Conte o que aconteceu com seu aparelho. Acompanhe o diagnóstico e aprove o orçamento antes do reparo." ? emptySettings.service_text : s.service_text;
  return <main className="storefront-home">
    <section className="container reference-hero repair-hero">
      <Image src="/brand/repair-natural-mcell.webp" fill loading="eager" fetchPriority="high" sizes="(max-width:1320px) 100vw, 1320px" className="reference-hero-background" alt="Técnico trabalhando no conserto de um celular" />
      <div className="reference-hero-copy"><p className="hero-eyebrow">CONSERTO DE CELULARES É A NOSSA ESPECIALIDADE <span /></p>
        <h1>{title === emptySettings.hero_title ? <>Seu celular em<br /><em>boas mãos.</em></> : title}</h1>
        <p className="hero-description">{heroText}</p>
        <div className="hero-actions"><BudgetLink className="primary-blue" /><Link className="button" href="/assistencia/acompanhar"><ClipboardList size={21} />Acompanhar conserto<ArrowRight size={17} /></Link></div>
        <HeroBenefits />
      </div>

    </section>
    {s.home_show_service && <section className="container reference-service">
      <div className="reference-service-photo"><Image src="/brand/repair-natural-mcell.webp" alt="Mãos de um técnico usando uma chave de precisão para consertar um celular em uma bancada" fill sizes="(max-width:700px) 100vw, 280px" /></div>
      <div className="reference-service-copy"><p className="eyebrow">ASSISTÊNCIA TÉCNICA ESPECIALIZADA</p><h2>{serviceTitle}</h2><p>{serviceText}</p></div>
      <div className="reference-service-steps">{[{ icon: ClipboardList, title: "Envie o problema", text: "Conte o que aconteceu com o seu aparelho." }, { icon: BadgeDollarSign, title: "Receba o orçamento", text: "Avaliamos e te enviamos o valor rapidamente." }, { icon: Settings2, title: "Acompanhe o conserto", text: "Fique por dentro do status do seu aparelho." }].map(({ icon: Icon, title, text }, i) => <div key={title} className="service-step"><div className="service-step-icon"><b>{i + 1}</b><Icon size={29} /></div><span><strong>{title}</strong><small>{text}</small></span>{i < 2 && <ArrowRight className="step-arrow" size={26} />}</div>)}</div>
      <BudgetLink />
    </section>}
    {s.home_show_categories && <nav className="container reference-categories" aria-label="Categorias de produtos">{categoryTiles.map(([name, slug], i) => {
      const registered = view.categories.find(c => c.active && (c.slug === slug || c.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")));
      return <Link key={slug} href={slug === "consertos" ? "/assistencia" : `/catalogo?categoria=${registered?.slug ?? slug}`}><span className={`category-photo category-photo-${i}`} aria-hidden="true" /><span className="category-label">{name}<ChevronRight size={17} /></span></Link>;
    })}</nav>}
    <section className="container reference-products-section">
      <div className="reference-section-heading"><div><h2>{best.length && s.home_show_bestsellers ? "Mais vendidos" : "Acessórios para o seu celular"}</h2><p>{best.length && s.home_show_bestsellers ? "Os produtos que são sucesso entre os nossos clientes" : "Complete o cuidado com seu aparelho"}</p></div><Link href="/catalogo">Ver todos os produtos<ArrowRight size={16} /></Link></div>
      <div className={`reference-products ${selection.length ? "" : "is-empty"}`}>{selection.map(p => <StorefrontProduct key={p.id} product={p} />)}{!selection.length && <div className="storefront-empty"><Package size={32} /><div><h3>{view.unavailable ? "Catálogo temporariamente indisponível" : "Novos produtos em breve"}</h3><p>{view.unavailable ? "Consulte o atendimento ou tente novamente em instantes." : "Estamos preparando o nosso catálogo para você."}</p></div></div>}</div><aside className="reference-budget-card"><BudgetLink /><p>Atendimento via WhatsApp<br />também disponível.</p></aside>
    </section>
    <Benefits settings={s} />
  </main>;
}
