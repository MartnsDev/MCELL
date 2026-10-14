"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, MapPin, MessageCircle, Trash2 } from "lucide-react";
import { useCart } from "@/lib/commerce/cart-store";
import { money, type Catalog } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
import { api } from "./api";
const subscribe = () => () => {};
const blankAddress = { street: "", district: "", city: "", state: "" };

export function WhatsAppCheckout({ view }: { view: Catalog }) {
  const { items, update } = useCart();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [kind, setKind] = useState<"person" | "company">("person");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(blankAddress);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [readyUrl, setReadyUrl] = useState("");
  const lookupVersion = useRef(0);
  const editVersion = useRef(0);
  const lastLookup = useRef("");
  const addressVersion = useRef(0);
  const changed = () => { editVersion.current++; setReadyUrl(""); setMessage(""); };
  const lines = items.map(item => {
    const product = view.products.find(p => p.variants.some(v => v.id === item.variant_id));
    const variant = product?.variants.find(v => v.id === item.variant_id);
    return { ...item, product, variant };
  });
  const total = lines.reduce((n, l) => n + (l.variant ? variantPrice(l.variant) * l.quantity : 0), 0);
  const invalid = view.unavailable || lines.some(l => !l.product?.active || !l.variant?.active || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > Math.min(99, l.variant.stock));
  const configured = /^\d{10,15}$/.test(view.settings.whatsapp);

  async function lookup() {
    if (cep.length !== 8 || lastLookup.current === cep) return;
    const version = ++lookupVersion.current;
    const edit = addressVersion.current;
    lastLookup.current = cep;
    setLookupBusy(true); setLookupMessage("");
    try {
      const result = await api("/api/commerce/postcode", { cep });
      if (version !== lookupVersion.current || edit !== addressVersion.current) return;
      changed();
      setAddress({ street: result.street, district: result.district, city: result.city, state: result.state });
      setLookupMessage(result.street ? "Endereço encontrado. Confira e informe o número." : "Confira cidade e estado e preencha rua e bairro.");
    } catch (error) {
      if (version === lookupVersion.current) { lastLookup.current = ""; setLookupMessage((error as Error).message); }
    } finally { if (version === lookupVersion.current) setLookupBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid || !configured || busy) return;
    setBusy(true); setMessage(""); setReadyUrl("");
    const edit = editVersion.current;
    const cartSnapshot = JSON.stringify(items);
    try {
      const result = await api("/api/commerce/whatsapp-order", {
        items, customer: kind === "company" ? { kind, name, cnpj } : { kind, name },
        address: { cep, ...address, number, complement },
      });
      if (edit !== editVersion.current || cartSnapshot !== JSON.stringify(useCart.getState().items)) {
        setMessage("Os dados mudaram. Confira o pedido e envie novamente."); return;
      }
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "wa.me") throw new Error("Não foi possível abrir o WhatsApp.");
      setReadyUrl(url.href);
      setMessage("Seu resumo está pronto. Envie a mensagem no WhatsApp para combinar a entrega e o pagamento.");
      window.open(url.href, "_blank", "noopener,noreferrer");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  if (!mounted) return <p role="status">Carregando seu carrinho…</p>;
  if (!items.length) return <section className="panel empty-cart"><h2>Seu carrinho está vazio.</h2><p>Escolha seus produtos para combinar a entrega pelo WhatsApp.</p><Link className="button" href="/catalogo">Explorar produtos</Link></section>;
  return <div className="whatsapp-cart">
    <section className="panel whatsapp-cart-summary">
      <div className="whatsapp-section-title"><span className="cart-step">1</span><div><h2>Confira seus produtos</h2><p>Ajuste as quantidades antes de enviar.</p></div></div>
      {lines.map(l => <div className="whatsapp-cart-row" key={l.variant_id}>
        <div className="whatsapp-cart-photo">{l.product?.images[0] && <Image src={l.variant?.image || l.product.images[0]} alt={l.product.name} fill sizes="80px" />}</div>
        <div className="whatsapp-cart-copy"><h3>{l.product?.name ?? "Produto indisponível"}</h3><p>{l.variant?.label}</p><strong>{l.variant ? money(variantPrice(l.variant)) : "Indisponível"}</strong>
          <div className="whatsapp-cart-row-actions"><label>Quantidade<input aria-label={`Quantidade de ${l.product?.name ?? "produto"}`} type="number" min="1" max={Math.max(1, Math.min(99, l.variant?.stock ?? 1))} value={l.quantity} disabled={busy} onChange={e => { changed(); update(l.variant_id, Math.max(1, Math.min(99, l.variant?.stock ?? 1, Math.floor(Number(e.target.value) || 1)))); }} /></label>
          <button type="button" className="cart-remove" disabled={busy} aria-label={`Remover ${l.product?.name ?? "produto"}`} onClick={() => { changed(); update(l.variant_id, 0); }}><Trash2 size={16} />Remover</button></div>
          {(!l.variant?.active || l.quantity > (l.variant?.stock ?? 0)) && <p className="error">Confira a disponibilidade e ajuste a quantidade ou remova o item.</p>}
        </div>
      </div>)}
      <div className="whatsapp-cart-total"><span>Subtotal dos produtos</span><strong>{money(total)}</strong></div>
      <div className="whatsapp-cart-freight"><span>Entrega</span><span>Frete a confirmar</span></div>
      <p className="whatsapp-cart-note">Disponibilidade, frete e pagamento serão combinados com a loja. Enviar a mensagem não reserva estoque nem confirma pagamento.</p>
      <Link href="/catalogo" className="text-link"><ArrowLeft size={16} /> Continuar escolhendo</Link>
    </section>
    <form className="panel whatsapp-cart-form" onSubmit={submit}>
      <div className="whatsapp-section-title"><span className="cart-step">2</span><div><h2>Seus dados e a entrega</h2><p>Sem cadastro. Você finaliza pelo WhatsApp.</p></div></div>
      <fieldset className="customer-kind" disabled={busy}><legend>Comprar como</legend>
        <label><input type="radio" name="customer_kind" value="person" checked={kind === "person"} onChange={() => { changed(); setKind("person"); }} />Pessoa física</label>
        <label><input type="radio" name="customer_kind" value="company" checked={kind === "company"} onChange={() => { changed(); setKind("company"); }} />Empresa</label>
      </fieldset>
      <fieldset className="whatsapp-fields" disabled={busy}>
        <label>{kind === "company" ? "Razão social" : "Nome completo"}<input name="name" autoComplete={kind === "company" ? "organization" : "name"} required maxLength={120} value={name} onChange={e => { changed(); setName(e.target.value); }} /></label>
        {kind === "company" && <label>CNPJ<input name="cnpj" autoComplete="off" required maxLength={18} minLength={14} placeholder="00.000.000/0000-00" value={cnpj} onChange={e => { changed(); setCnpj(e.target.value.toUpperCase()); }} /></label>}
        <div className="whatsapp-address-title"><MapPin size={18} /><h3>Endereço para entrega</h3></div>
        <div className="postcode-field"><label htmlFor="delivery-postcode">CEP</label><div className="postcode-input"><input id="delivery-postcode" name="postal-code" autoComplete="postal-code" inputMode="numeric" required pattern="[0-9]{5}-?[0-9]{3}" maxLength={9} placeholder="00000-000" value={cep.length > 5 ? `${cep.slice(0,5)}-${cep.slice(5)}` : cep} onBlur={lookup} onChange={e => { changed(); addressVersion.current++; lookupVersion.current++; lastLookup.current = ""; setLookupBusy(false); setLookupMessage(""); setAddress(blankAddress); setCep(e.target.value.replace(/\D/g, "").slice(0,8)); }} /><button type="button" className="secondary" disabled={lookupBusy || cep.length !== 8} onClick={lookup}>{lookupBusy ? "Buscando…" : "Buscar CEP"}</button></div></div>
        <p className="postcode-status" role="status">{lookupBusy ? "Buscando endereço…" : lookupMessage || "Informe o CEP para buscar o endereço. Você também pode preencher manualmente."}</p>
        <label>Rua / Avenida<input name="address-line1" autoComplete="address-line1" required maxLength={200} value={address.street} onChange={e => { changed(); addressVersion.current++; setAddress({ ...address, street: e.target.value }); }} /></label>
        <div className="whatsapp-field-pair"><label>Número<input name="number" required maxLength={20} placeholder="Ex.: 123 ou S/N" value={number} onChange={e => { changed(); setNumber(e.target.value); }} /></label><label>Complemento <small>(opcional)</small><input name="address-line2" autoComplete="address-line2" maxLength={100} value={complement} onChange={e => { changed(); setComplement(e.target.value); }} /></label></div>
        <label>Bairro<input name="district" required maxLength={200} value={address.district} onChange={e => { changed(); addressVersion.current++; setAddress({ ...address, district: e.target.value }); }} /></label>
        <div className="whatsapp-field-pair city-state"><label>Cidade<input name="address-level2" autoComplete="address-level2" required maxLength={200} value={address.city} onChange={e => { changed(); addressVersion.current++; setAddress({ ...address, city: e.target.value }); }} /></label><label>UF<input name="address-level1" autoComplete="address-level1" required minLength={2} maxLength={2} pattern="[A-Z]{2}" value={address.state} onChange={e => { changed(); addressVersion.current++; setAddress({ ...address, state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }); }} /></label></div>
      </fieldset>
      {!configured && <p className="notice">A loja está configurando o WhatsApp para receber pedidos. Tente novamente em breve.</p>}
      {invalid && <p className="notice error">Há itens indisponíveis ou quantidades acima do estoque. Confira seu carrinho antes de enviar.</p>}
      <p className="whatsapp-privacy">Ao continuar, você abre o WhatsApp com os itens e seus dados de entrega para enviar à M’Cell. Esses campos não ficam salvos no carrinho. <Link href="/privacidade">Privacidade</Link></p>
      <button type="submit" className="whatsapp-order-button" disabled={busy || invalid || !configured}><MessageCircle size={20} />{busy ? "Preparando resumo…" : "Enviar pedido pelo WhatsApp"}</button>
      <p role="status" className={message ? "notice" : ""}>{message}</p>
      {readyUrl && <a href={readyUrl} target="_blank" rel="noopener noreferrer" className="button whatsapp-order-button">Abrir WhatsApp com o resumo</a>}
    </form>
  </div>;
}
