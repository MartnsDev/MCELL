"use client";
import Image from "next/image";
import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { useState } from "react";
import {
  type Product,
  type Settings,
  type Quote,
  money,
} from "@/lib/commerce/types";
import { useCart } from "@/lib/commerce/cart-store";
import { WhatsApp } from "./shell";
import { api } from "./api";
export function ProductDetail({
  product: p,
  settings: s,
}: {
  product: Product;
  settings: Settings;
}) {
  const [id, setId] = useState(p.variants.length === 1 ? p.variants[0].id : "");
  const v = p.variants.find((x) => x.id === id);
  const [picture, setPicture] = useState(p.images[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [cep, setCep] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [busy, setBusy] = useState(false);
  const add = useCart((s) => s.add);
  return (
    <div className="detail">
      <div>
        <div className="gallery-main">
          {picture ? (
            <Image
              src={picture}
              alt={p.name}
              fill
              sizes="(max-width:640px) 90vw, 50vw"
              priority
            />
          ) : (
            <Package size={70} />
          )}
        </div>
        <div className="thumbnails">
          {p.images.map((img, i) => (
            <button
              key={img}
              className="secondary"
              aria-label={`Ver imagem ${i + 1}`}
              onClick={() => setPicture(img)}
            >
              <Image src={img} alt="" fill sizes="70px" />
            </button>
          ))}
        </div>
        <div className="subsection">
          <h2>Sobre o produto</h2>
          <p className="policy">{p.description}</p>
          <table className="details-table">
            <tbody>
              {Object.entries(p.specs).map(([k, val]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <p className="eyebrow">{p.brand || p.product_type}</p>
        <h1>{p.name}</h1>
        {p.compatibility && (
          <p>
            <strong>Compatibilidade:</strong> {p.compatibility}
          </p>
        )}
        <div className="detail-price">
          {v ? money(v.promo_cents ?? v.price_cents) : "Selecione uma versão"}
          {v?.promo_cents && (
            <small style={{ display: "block", fontSize: 14 }}>
              <s>{money(v.price_cents)}</s>
            </small>
          )}
        </div>
        <label>
          Versão / modelo / cor
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setQuantity(1);
              setQuotes([]);
              setMessage("");
              const selected = p.variants.find((v) => v.id === e.target.value);
              setPicture(selected?.image ?? p.images[0] ?? "");
            }}
          >
            <option value="">Escolha a combinação</option>
            {p.variants.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.stock}>
                {v.label} · {money(v.promo_cents ?? v.price_cents)}
                {!v.stock ? " · Esgotado" : ""}
              </option>
            ))}
          </select>
        </label>
        {v && (
          <>
            <p className="stock">
              {v.stock > 0 ? `${v.stock} unidade(s) em estoque` : "Esgotado"} ·
              SKU {v.sku}
            </p>
            {Object.entries(v.attributes).map(([k, val]) => (
              <p key={k}>
                {k}: {val}
              </p>
            ))}
          </>
        )}
        <div className="actions">
          <label>
            Quantidade
            <input
              aria-label="Quantidade"
              style={{ width: 85 }}
              type="number"
              min="1"
              max={Math.min(99, v?.stock ?? 1)}
              value={quantity}
              onChange={(e) => {
                setQuantity(
                  Math.max(
                    1,
                    Math.min(99, v?.stock ?? 1, Number(e.target.value) || 1),
                  ),
                );
                setQuotes([]);
              }}
            />
          </label>
          <button
            disabled={p.catalog_only || !v || !v.stock}
            onClick={() => {
              if (v && !p.catalog_only) {
                add(v.id, quantity, v.stock);
                setMessage(
                  "Produto adicionado. Confira seu carrinho para finalizar.",
                );
              }
            }}
          >
            <ShoppingBag size={18} />
            {p.catalog_only ? "Compra online em configuração" : "Adicionar ao carrinho"}
          </button>
        </div>
        <p role="status">{message}</p>
        {p.catalog_only ? <p className="notice">Os produtos estão disponíveis para consulta. A compra online estará disponível em breve.</p> : <Link className="text-link" href="/carrinho">Ir para o carrinho →</Link>}
        <div className="subsection panel">
          <h3>Entrega ou retirada</h3>
          {s.pickup_enabled && (
            <p>
              Retirada gratuita: {s.pickup_address}
              <br />
              {s.pickup_hours}
            </p>
          )}
          <label>
            CEP de entrega
            <input
              inputMode="numeric"
              maxLength={9}
              value={cep}
              placeholder="00000-000"
              onChange={(e) => {
                setCep(e.target.value.replace(/\D/g, "").slice(0, 8));
                setQuotes([]);
              }}
            />
          </label>
          <button
            className="secondary"
            style={{ marginTop: 12 }}
            disabled={p.catalog_only || busy || !v || !v.stock}
            onClick={async () => {
              if (!v) return;
              setBusy(true);
              setMessage("");
              setQuotes([]);
              try {
                const r = await api("/api/commerce/quote", {
                  items: [{ variant_id: v.id, quantity }],
                  cep,
                });
                setQuotes(r.quotes);
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Consultando…" : "Calcular SEDEX"}
          </button>
          {quotes.map((q) => (
            <p key={q.id}>
              {q.service}: {money(q.price_cents)} · prazo estimado {q.days}{" "}
              dia(s) úteis
            </p>
          ))}
          <p>
            <small>
              O frete será recalculado para todos os itens no carrinho.
            </small>
          </p>
          <WhatsApp
            settings={s}
            text={`Olá! Quero consultar entrega de ${p.name} (${v?.sku ?? "versão a definir"}) para o CEP ${cep}.`}
          />
        </div>
      </div>
    </div>
  );
}
