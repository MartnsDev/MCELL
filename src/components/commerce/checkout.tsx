"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/lib/commerce/cart-store";
import { money, type Catalog, type Quote } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
import { api, privateToken, remember } from "./api";
import { WhatsApp } from "./shell";
const subscribe = () => () => {};
export function Checkout({ view }: { view: Catalog }) {
  const { items, update, clear } = useCart();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [delivery, setDelivery] = useState<"pickup" | "shipping">(
    view.settings.pickup_enabled ? "pickup" : "shipping",
  );
  const [cep, setCep] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    protocol: string;
    token: string;
    error?: string;
  } | null>(null);
  const [attempt, setAttempt] = useState<{
    key: string;
    token: string;
    body: Record<string, unknown>;
  } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("mc-pending-order") ?? "null",
        );
        if (!saved) return;
        const r = await api("/api/commerce/resume-order", {
          request_key: saved.key,
          token: saved.token,
        });
        if (active) {
          remember("order", r.protocol, saved.token);
          setResult({ protocol: r.protocol, token: saved.token });
          clear();
          sessionStorage.removeItem("mc-pending-order");
        }
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [clear]);
  const lines = items.map((i) => {
    const p = view.products.find((p) =>
      p.variants.some((v) => v.id === i.variant_id),
    );
    return {
      ...i,
      product: p,
      variant: p?.variants.find((v) => v.id === i.variant_id),
    };
  });
  const subtotal = lines.reduce(
    (n, l) => n + (l.variant ? variantPrice(l.variant) * l.quantity : 0),
    0,
  );
  const invalid = lines.some(
    (l) => !l.variant || !l.variant.active || l.quantity > l.variant.stock,
  );
  const reset = () => {
    setQuote(null);
    setAttempt(null);
    setMessage("");
  };
  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const token = attempt?.token ?? privateToken(),
        key = attempt?.key ?? crypto.randomUUID();
      const payload = attempt?.body ?? {
        items,
        expected_subtotal_cents: subtotal,
        customer: {
          name: form.get("name"),
          phone: String(form.get("phone")).replace(/\D/g, ""),
          email: form.get("email"),
          ...(form.get("document")
            ? { document: String(form.get("document")).replace(/\D/g, "") }
            : {}),
        },
        delivery,
        ...(delivery === "shipping"
          ? {
              quote_id: quote?.id,
              address: {
                cep,
                street: form.get("street"),
                number: form.get("number"),
                complement: form.get("complement") ?? "",
                district: form.get("district"),
                city: form.get("city"),
                state: form.get("state"),
              },
            }
          : {}),
        payment_method: form.get("payment_method"),
        request_key: key,
        token,
      };
      setAttempt({ key, token, body: payload });
      sessionStorage.setItem(
        "mc-pending-order",
        JSON.stringify({ key, token }),
      );
      const r = await api("/api/commerce/order", payload);
      remember("order", r.protocol, token);
      sessionStorage.removeItem("mc-pending-order");
      setResult({ protocol: r.protocol, token, error: r.checkout_error });
      clear();
      if (r.checkout_url) window.location.assign(r.checkout_url);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!mounted) return <p>Carregando carrinho…</p>;
  if (result)
    return (
      <div className="panel narrow">
        <p className="eyebrow">PEDIDO REGISTRADO</p>
        <h2>{result.protocol}</h2>
        <p>
          Guarde sua chave privada para acompanhar o pedido. O pagamento será
          confirmado pelo servidor.
        </p>
        <div className="tracking-key">{result.token}</div>
        {result.error && <p className="notice error">{result.error}</p>}
        <Link className="button" style={{ marginTop: 20 }} href="/pedidos">
          Acompanhar pedido
        </Link>
        <WhatsApp
          settings={view.settings}
          text={`Olá! Quero combinar o pagamento do pedido ${result.protocol}.`}
        />
      </div>
    );
  if (!items.length)
    return (
      <div className="panel">
        <h2>Seu carrinho está vazio.</h2>
        <p>
          Explore o catálogo e escolha a versão compatível com seu aparelho.
        </p>
        <Link className="button" href="/catalogo">
          Explorar produtos
        </Link>
      </div>
    );
  return (
    <div className="cart-layout">
      <section className="panel">
        <h2>Seus produtos</h2>
        {lines.map((l) => (
          <div className="cart-row" key={l.variant_id}>
            <div>
              <h3>{l.product?.name ?? "Produto indisponível"}</h3>
              <p>
                {l.variant?.label} · SKU {l.variant?.sku}
              </p>
              <strong>
                {l.variant ? money(variantPrice(l.variant)) : "Indisponível"}
              </strong>
              {l.variant && l.quantity > l.variant.stock && (
                <p className="error">Estoque atual: {l.variant.stock}</p>
              )}
            </div>
            <label>
              Quantidade
              <input
                type="number"
                min="1"
                max={Math.min(99, l.variant?.stock ?? 1)}
                value={l.quantity}
                disabled={busy}
                onChange={(e) => {
                  update(
                    l.variant_id,
                    Math.max(1, Number(e.target.value) || 1),
                  );
                  reset();
                }}
              />
            </label>
            <button
              className="secondary"
              aria-label={`Remover ${l.product?.name ?? "produto"}`}
              disabled={busy}
              onClick={() => {
                update(l.variant_id, 0);
                reset();
              }}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div>
            <span>{delivery === "pickup" ? "Retirada local" : "Frete"}</span>
            <span>
              {delivery === "pickup"
                ? "Grátis"
                : quote
                  ? money(quote.price_cents)
                  : "A calcular"}
            </span>
          </div>
          <div className="total">
            <span>Total</span>
            <strong>
              {delivery === "shipping" && !quote
                ? "Calcule o frete"
                : money(subtotal + (quote?.price_cents ?? 0))}
            </strong>
          </div>
        </div>
        <p>
          <small>
            Valores e estoque serão validados no servidor antes da confirmação.
          </small>
        </p>
        {invalid && (
          <p className="notice error">
            Há itens indisponíveis ou com estoque insuficiente. Ajuste o
            carrinho.
          </p>
        )}
      </section>
      <form
        className="panel"
        onSubmit={pay}
        onChange={() => {
          if (attempt)
            setMessage(
              "Existe uma tentativa pendente. Tente novamente com os mesmos dados ou inicie outra tentativa.",
            );
        }}
      >
        <h2>Finalizar pedido</h2>
        <div className="form-grid subsection">
          <label>
            Nome completo
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
          <label>
            Telefone / WhatsApp
            <input name="phone" required type="tel" autoComplete="tel" />
          </label>
          <label>
            Email
            <input name="email" required type="email" autoComplete="email" />
          </label>
          <label>
            CPF / CNPJ (se necessário)
            <input name="document" inputMode="numeric" />
          </label>
          <label className="full">
            Como deseja receber?
            <select
              value={delivery}
              disabled={busy}
              onChange={(e) => {
                setDelivery(e.target.value as typeof delivery);
                reset();
              }}
            >
              {view.settings.pickup_enabled && (
                <option value="pickup">Retirada local gratuita</option>
              )}
              <option value="shipping">Envio por SEDEX</option>
            </select>
          </label>
          {delivery === "pickup" ? (
            <div className="full notice">
              {view.settings.pickup_address}
              <br />
              {view.settings.pickup_hours}
              <p>Aguarde a confirmação de que o pedido está pronto.</p>
            </div>
          ) : (
            <>
              <label>
                CEP
                <input
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value.replace(/\D/g, "").slice(0, 8));
                    reset();
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary"
                disabled={busy || invalid}
                onClick={async () => {
                  setBusy(true);
                  setQuote(null);
                  setAttempt(null);
                  setMessage("");
                  try {
                    const r = await api("/api/commerce/quote", { items, cep });
                    setQuote(r.quotes[0]);
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Consultando…" : "Calcular frete"}
              </button>
              {quote && (
                <div className="full notice">
                  SEDEX · {money(quote.price_cents)} · {quote.days} dia(s) úteis
                  estimados.
                  <br />
                  Cotação válida até{" "}
                  {new Date(quote.expires_at).toLocaleTimeString("pt-BR")}.
                  <label>
                    <input type="checkbox" required />
                    Confirmo esta modalidade de envio
                  </label>
                </div>
              )}
              <label className="full">
                Rua / avenida
                <input name="street" required autoComplete="address-line1" />
              </label>
              <label>
                Número
                <input name="number" required maxLength={20} />
              </label>
              <label>
                Complemento
                <input name="complement" maxLength={100} />
              </label>
              <label>
                Bairro
                <input name="district" required />
              </label>
              <label>
                Cidade
                <input name="city" required autoComplete="address-level2" />
              </label>
              <label>
                UF
                <select name="state" required>
                  <option value="">Selecione</option>
                  {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
                    .split(" ")
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </label>
            </>
          )}
          <label className="full">
            Pagamento
            <select name="payment_method" required>
              {view.settings.payment_enabled && (
                <option value="mercadopago">
                  Mercado Pago · Pix ou cartão
                </option>
              )}
              {view.settings.manual_payment && (
                <option value="manual">Pagamento a combinar</option>
              )}
              {!view.settings.payment_enabled &&
                !view.settings.manual_payment && (
                  <option value="">Pagamento em configuração</option>
                )}
            </select>
          </label>
        </div>
        <p role="status" className={message ? "notice error" : ""}>
          {message}
        </p>
        {attempt && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setAttempt(null);
              setMessage(
                "Nova tentativa iniciada. Se já houver um pedido, consulte-o antes de confirmar outro.",
              );
            }}
          >
            Iniciar nova tentativa
          </button>
        )}
        <button
          data-mp-checkout-cta="checkout-pro"
          disabled={
            busy ||
            invalid ||
            (!view.settings.payment_enabled && !view.settings.manual_payment) ||
            (delivery === "shipping" && !quote)
          }
        >
          {busy ? "Processando…" : "Confirmar pedido e pagar"}
        </button>
        <p>
          <small>
            Sem pedido mínimo. Nenhum status da tela de retorno confirma
            pagamento.
          </small>
        </p>
        <WhatsApp
          settings={view.settings}
          text={`Olá! Quero consultar a entrega dos itens: ${lines.map((l) => `${l.product?.name ?? ""} ${l.variant?.label ?? ""} (${l.quantity} un.)`).join(", ")}. CEP: ${cep}.`}
        />
      </form>
    </div>
  );
}
