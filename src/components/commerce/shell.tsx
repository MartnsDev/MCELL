import Link from "next/link";
import { Search, ArrowRight, ShieldCheck, Truck, MapPin, Wrench, Store, UserRound, Heart, MessageCircle, CreditCard, Phone, Mail, Music2 } from "lucide-react";
import type { Settings, Category, Product } from "@/lib/commerce/types";
import { CartLink } from "./cart-link";

export function Brand({ footer = false }: { footer?: boolean }) {
  return <Link className={`logo ${footer ? "logo-footer" : ""}`} href="/" aria-label="M'Cell início">
    <svg className="logo-image" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M8 54V10h10l14 23 14-23h10v44H45V29L32 49 19 29v25H8Z" fill="currentColor" />
    </svg>
  </Link>;
}
export function WhatsApp({ settings, text = "Olá! Quero falar com a M'Cell." }: { settings: Settings; text?: string }) {
  const content = <><MessageCircle size={27} /><span><strong>Fale no WhatsApp</strong><small>Atendimento rápido</small></span></>;
  return settings.whatsapp ? <a className="button whatsapp-button" href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">{content}</a> : <Link className="button whatsapp-button" href="/assistencia">{content}</Link>;
}
export function Header({ categories, settings, products }: { categories: Category[]; settings: Settings; products: Product[] }) {
  return <>
    <a className="skip" href="#conteudo">Ir para o conteúdo</a>
    <div className="topbar"><div className="topbar-inner">
      <div><Store /><span><strong>Retirada local em nossa loja</strong><small>{settings.pickup_enabled ? settings.pickup_address : "Consulte a disponibilidade"}</small></span></div>
      <div><Truck /><span><strong>Envio para todo o Brasil</strong><small>Com rastreamento</small></span></div>
      <div><Wrench /><span><strong>Assistência técnica especializada</strong><small>Seu celular em boas mãos</small></span></div>
    </div></div>
    <header className="header"><div className="container header-main">
      <Brand />
      <form className="search" action="/catalogo">
        <button aria-label="Buscar" type="submit"><Search size={19} /></button>
        <input name="q" aria-label="Buscar produtos" placeholder="O que você está procurando?" />
        <select name="categoria" aria-label="Categoria"><option value="">Todas as categorias</option>{categories.filter(c => c.active).map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
      </form>
      <div className="header-links">
        <Link className="account-link" href="/conta" aria-label="Minha conta"><UserRound size={25} /><span><strong>Minha conta</strong><small>Entrar / Cadastrar</small></span></Link>
        <Link className="favorites-link" href="/favoritos" aria-label="Favoritos"><Heart size={23} /><small>Favoritos</small></Link>
        <CartLink products={products} />
        <WhatsApp settings={settings} />
      </div>
    </div></header>
  </>;
}
export function Benefits({ settings }: { settings: Settings }) {
  return <div className="benefits container">
    <div><Store /><span><strong>Retirada local</strong><small>{settings.pickup_enabled ? "Compre online e retire na loja" : "Consulte a disponibilidade"}<br />{settings.pickup_enabled ? settings.pickup_address : "Atendimento da loja"}</small></span></div>
    <div><Truck /><span><strong>Frete calculado</strong><small>Para todo o Brasil<br />com rastreamento</small></span></div>
    <div><MessageCircle /><span><strong>Atendimento via WhatsApp</strong><small>Tire suas dúvidas rapidamente<br />e receba suporte especializado</small></span></div>
    <div><CreditCard /><span><strong>Pagamento seguro</strong><small>Consulte as formas de pagamento<br />disponíveis no checkout</small></span></div>
  </div>;
}
export function Footer({ settings }: { settings: Settings }) {
  return <footer className="footer"><div className="container footer-grid">
    <div className="footer-brand"><Brand footer /></div>
    <div><h3>Institucional</h3><Link href="/sobre">Sobre a M&apos;Cell</Link><Link href="/entregas">Nossa loja</Link><Link href="/privacidade">Política de privacidade</Link><Link href="/termos">Termos de uso</Link></div>
    <div><h3>Ajuda</h3><Link href="/catalogo">Como comprar</Link><Link href="/entregas">Formas de pagamento</Link><Link href="/entregas">Trocas e devoluções</Link><Link href="/entregas">Entrega e prazos</Link><Link href="/assistencia">Fale conosco</Link></div>
    <div className="footer-contact"><h3>Atendimento</h3>{settings.whatsapp && <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer"><Phone size={14} /><span>{settings.whatsapp}<small>{settings.pickup_hours}</small></span></a>}{settings.email && <a href={`mailto:${settings.email}`}><Mail size={14} />{settings.email}</a>}{settings.pickup_enabled ? <p><MapPin size={14} />{settings.pickup_address}</p> : <Link href="/assistencia"><MessageCircle size={14} />Solicitar atendimento</Link>}</div>
    <div className="footer-social"><h3>Siga a M&apos;Cell</h3><div aria-label="Redes sociais em configuração"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M14 21v-8h3l.4-3h-3.4V8.5c0-.8.3-1.5 1.5-1.5H18V4h-2.5C12 4 11 6 11 8.5V10H8v3h3v8" fill="#052b50" /></svg><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3Z" fill="#052b50" /></svg><Music2 /></div></div>
  </div></footer>;
}
export function HeroBenefits() {
  return <div className="hero-benefits">
    <div><ShieldCheck /><span>Produtos originais<br />e de qualidade</span></div><div><Truck /><span>Entrega para todo o Brasil<br />com rastreamento</span></div><div><CreditCard /><span>Pagamento seguro<br />no checkout</span></div><div><Heart /><span>Atendimento especializado<br />antes e depois da compra</span></div>
  </div>;
}
export function BudgetLink({ className = "" }: { className?: string }) { return <Link className={`button budget-button ${className}`} href="/assistencia"><Wrench size={18} />Solicitar orçamento<ArrowRight size={15} /></Link>; }
