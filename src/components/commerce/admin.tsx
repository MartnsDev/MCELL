"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "./api";
import {
  money,
  orderLabels,
  repairLabels,
  type Category,
  type Service,
  type Settings,
  type Product,
  type Variant,
  emptySettings,
} from "@/lib/commerce/types";
type AdminVariant = Omit<Variant, "id" | "product_id"> & {
  id?: string;
  cost_cents: number;
  costs?: { cost_cents: number }[] | { cost_cents: number };
};
type Draft = Omit<Product, "id" | "created_at" | "variants"> & {
  id?: string;
  variants: AdminVariant[];
};
const blankVariant = (): AdminVariant => ({
  label: "",
  sku: "",
  attributes: {},
  image: null,
  price_cents: 0,
  promo_cents: null,
  stock: 0,
  active: true,
  weight_g: 100,
  height_cm: 2,
  width_cm: 11,
  length_cm: 16,
  cost_cents: 0,
});
const blankProduct = (): Draft => ({
  category_id: "",
  name: "",
  slug: "",
  description: "",
  brand: "",
  product_type: "",
  compatibility: "",
  specs: {},
  images: [],
  featured: false,
  active: false,
  variants: [blankVariant()],
});
function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
async function read<T>(resource: string): Promise<T[]> {
  const r = await fetch(`/api/admin/${resource}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d.data;
}
export function ProductAdmin() {
  const [products, setProducts] = useState<Draft[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imports, setImports] = useState<{ category_name: string; category_slug: string; pending: string[]; product: Draft }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [p, c] = await Promise.all([
        read<Draft>("products"),
        read<Category>("categories"),
      ]);
      setProducts(p);
      setCategories(c);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([read<Draft>("products"), read<Category>("categories")])
      .then(([p, c]) => {
        if (active) {
          setProducts(p);
          setCategories(c);
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function edit(p: Draft) {
    setDraft({
      ...p,
      variants: p.variants.map((v) => ({
        ...v,
        cost_cents:
          (Array.isArray(v.costs)
            ? v.costs[0]?.cost_cents
            : v.costs?.cost_cents) ??
          v.cost_cents ??
          0,
      })),
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        ...(draft.id ? { id: draft.id } : {}),
        category_id: draft.category_id,
        name: draft.name,
        slug: draft.slug,
        description: draft.description,
        brand: draft.brand,
        product_type: draft.product_type,
        compatibility: draft.compatibility,
        specs: draft.specs,
        images: draft.images,
        active: draft.active,
        featured: draft.featured,
        variants: draft.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          label: v.label,
          sku: v.sku,
          attributes: v.attributes,
          image: v.image,
          price_cents: v.price_cents,
          promo_cents: v.promo_cents,
          stock: v.stock,
          active: v.active,
          weight_g: v.weight_g,
          height_cm: v.height_cm,
          width_cm: v.width_cm,
          length_cm: v.length_cm,
          cost_cents: v.cost_cents,
        })),
      };
      await api("/api/admin/products", payload);
      setMessage("Produto salvo.");
      setDraft(null);
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof Draft, value: unknown) =>
    setDraft((p) => (p ? { ...p, [key]: value } : p));
  const variant = (index: number, key: keyof AdminVariant, value: unknown) =>
    setDraft((p) =>
      p
        ? {
            ...p,
            variants: p.variants.map((v, i) =>
              i === index ? { ...v, [key]: value } : v,
            ),
          }
        : p,
    );
  return (
    <>
      <div className="section-heading">
        <h1>Produtos</h1>
        <button onClick={() => setDraft(blankProduct())}>
          Cadastrar produto
        </button>
      </div>
      <p role="status" className={message ? "notice" : ""}>
        {message}
      </p>
      {!draft && <div className="panel subsection">
        <h2>Produtos preparados das fotos</h2>
        <p>Revise estoque, categoria e medidas antes de salvar. O custo é privado; descontos usam apenas o preço normal confirmado.</p>
        <button className="secondary" onClick={async () => {
          try { setImports(await read("product-imports")); }
          catch (e) { setMessage((e as Error).message); }
        }}>Carregar os cadastros preparados</button>
        {imports.map(item => <div className="subsection" key={item.product.id}>
          <strong>{item.product.name}</strong> · {money(item.product.variants[0].price_cents)} · {item.category_name}
          <p>Pendente: {item.pending.join("; ")}</p>
          <button onClick={() => {
            const existing = products.find(p => p.id === item.product.id || p.slug === item.product.slug || p.variants.some(v => item.product.variants.some(i => i.sku === v.sku)));
            if (existing) { edit(existing); setMessage("Produto já cadastrado: aberto o registro existente."); return; }
            setDraft({ ...item.product, category_id: categories.find(c => c.slug === item.category_slug)?.id ?? "" });
            setMessage("Cadastro preparado. Confirme estoque, categoria e medidas antes de salvar e ativar.");
          }}>Revisar cadastro</button>
        </div>)}
      </div>}
      {draft ? (
        <form className="panel" onSubmit={save}>
          <h2>{draft.id ? "Editar produto" : "Novo produto"}</h2>
          <div className="form-grid subsection">
            <label>
              Nome
              <input
                required
                value={draft.name}
                onChange={(e) => {
                  field("name", e.target.value);
                  if (!draft.id) field("slug", slug(e.target.value));
                }}
              />
            </label>
            <label>
              Endereço amigável
              <input
                required
                value={draft.slug}
                onChange={(e) => field("slug", e.target.value)}
              />
            </label>
            <label>
              Categoria
              <select
                required
                value={draft.category_id}
                onChange={(e) => field("category_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!c.active ? " (inativa)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Marca
              <input
                value={draft.brand}
                onChange={(e) => field("brand", e.target.value)}
              />
            </label>
            <label>
              Tipo de produto
              <input
                value={draft.product_type}
                onChange={(e) => field("product_type", e.target.value)}
              />
            </label>
            <label>
              Modelos compatíveis
              <input
                value={draft.compatibility}
                onChange={(e) => field("compatibility", e.target.value)}
              />
            </label>
            <label className="full">
              Descrição
              <textarea
                required
                value={draft.description}
                onChange={(e) => field("description", e.target.value)}
              />
            </label>
            <label className="full">
              Características técnicas (uma por linha: nome: valor)
              <textarea
                defaultValue={Object.entries(draft.specs)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
                onChange={(e) =>
                  field(
                    "specs",
                    Object.fromEntries(
                      e.target.value
                        .split("\n")
                        .filter((l) => l.includes(":"))
                        .map((l) => {
                          const i = l.indexOf(":");
                          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
                        }),
                    ),
                  )
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => field("active", e.target.checked)}
              />
              Publicar produto
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => field("featured", e.target.checked)}
              />
              Destaque na página inicial
            </label>
            <label className="full">
              Imagens (JPEG, PNG ou WebP, até 5 MB cada)
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  setMessage("");
                  try {
                    const urls = [...draft.images];
                    for (const f of Array.from(e.target.files ?? [])) {
                      if (urls.length >= 12)
                        throw new Error("Limite de 12 imagens.");
                      const r = await fetch("/api/admin/images", {
                        method: "PUT",
                        headers: { "Content-Type": f.type },
                        body: f,
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      urls.push(d.url);
                    }
                    field("images", urls);
                  } catch (error) {
                    setMessage((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
          <div className="upload-preview">
            {draft.images.map((img, i) => (
              <div key={img}>
                <Image
                  src={img}
                  alt={`Imagem ${i + 1}`}
                  width={90}
                  height={90}
                />
                <small>{i === 0 ? "Principal" : ""}</small>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    field("images", [
                      img,
                      ...draft.images.filter((x) => x !== img),
                    ])
                  }
                >
                  Principal
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    field(
                      "images",
                      draft.images.filter((x) => x !== img),
                    )
                  }
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
          <h2>Variações e estoque</h2>
          <p>
            Cadastre somente combinações existentes. Preço, SKU e estoque
            pertencem a cada versão.
          </p>
          {draft.variants.map((v, i) => (
            <section className="variant-form" key={v.id ?? i}>
              <h3>Versão {i + 1}</h3>
              <div className="form-grid subsection">
                <label>
                  Combinação / modelo / cor
                  <input
                    required
                    value={v.label}
                    onChange={(e) => variant(i, "label", e.target.value)}
                  />
                </label>
                <label>
                  SKU único
                  <input
                    required
                    value={v.sku}
                    onChange={(e) => variant(i, "sku", e.target.value)}
                  />
                </label>
                {(["price_cents", "promo_cents", "cost_cents"] as const).map(
                  (k) => (
                    <label key={k}>
                      {k === "price_cents"
                        ? "Preço (R$)"
                        : k === "promo_cents"
                          ? "Promoção opcional (R$)"
                          : "Custo administrativo (R$)"}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v[k] === null ? "" : (v[k] ?? 0) / 100}
                        onChange={(e) =>
                          variant(
                            i,
                            k,
                            e.target.value === "" && k === "promo_cents"
                              ? null
                              : Math.round(Number(e.target.value) * 100),
                          )
                        }
                      />
                    </label>
                  ),
                )}
                {(
                  [
                    "stock",
                    "weight_g",
                    "height_cm",
                    "width_cm",
                    "length_cm",
                  ] as const
                ).map((k) => (
                  <label key={k}>
                    {
                      {
                        stock: "Estoque disponível",
                        weight_g: "Peso (g)",
                        height_cm: "Altura (cm)",
                        width_cm: "Largura (cm)",
                        length_cm: "Comprimento (cm)",
                      }[k]
                    }
                    <input
                      required
                      type="number"
                      min={k === "stock" ? 0 : 1}
                      step="1"
                      value={v[k]}
                      onChange={(e) => variant(i, k, Number(e.target.value))}
                    />
                  </label>
                ))}
                <label>
                  Imagem desta versão
                  <select
                    value={v.image ?? ""}
                    onChange={(e) =>
                      variant(i, "image", e.target.value || null)
                    }
                  >
                    <option value="">Imagem principal</option>
                    {draft.images.map((img, n) => (
                      <option key={img} value={img}>
                        Imagem {n + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={v.active}
                    onChange={(e) => variant(i, "active", e.target.checked)}
                  />
                  Versão ativa
                </label>
                <label className="full">
                  Atributos (nome: valor, um por linha)
                  <textarea
                    defaultValue={Object.entries(v.attributes)
                      .map(([k, val]) => `${k}: ${val}`)
                      .join("\n")}
                    onChange={(e) =>
                      variant(
                        i,
                        "attributes",
                        Object.fromEntries(
                          e.target.value
                            .split("\n")
                            .filter((l) => l.includes(":"))
                            .map((l) => {
                              const n = l.indexOf(":");
                              return [
                                l.slice(0, n).trim(),
                                l.slice(n + 1).trim(),
                              ];
                            }),
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <button
                className="secondary"
                type="button"
                disabled={draft.variants.length === 1}
                onClick={() =>
                  field(
                    "variants",
                    draft.variants.filter((_, n) => n !== i),
                  )
                }
              >
                Remover versão do cadastro
              </button>
            </section>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              field("variants", [...draft.variants, blankVariant()])
            }
          >
            Adicionar variação
          </button>
          <div className="notice">
            <strong>Prévia: {draft.name || "Nome do produto"}</strong>
            <p>
              {draft.brand} · {draft.compatibility}
              <br />
              {draft.variants
                .map(
                  (v) =>
                    `${v.label || "Versão"}: ${money(v.promo_cents ?? v.price_cents)} (${v.stock} un.)`,
                )
                .join(" / ")}
            </p>
          </div>
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setDraft(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Variações</th>
                <th>Estoque</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <br />
                    {p.slug}
                  </td>
                  <td>{p.variants.length}</td>
                  <td>{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                  <td>{p.active ? "Publicado" : "Rascunho"}</td>
                  <td>
                    <button className="secondary" onClick={() => edit(p)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && (
            <p>Nenhum produto cadastrado. Comece pelo primeiro produto.</p>
          )}
        </div>
      )}
    </>
  );
}
export function ListAdmin({
  resource,
}: {
  resource: "categories" | "services";
}) {
  const [items, setItems] = useState<(Category & Service)[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const cat = resource === "categories";
  async function load() {
    try {
      setItems(await read<Category & Service>(resource));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    read<Category & Service>(resource)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [resource]);
  return (
    <>
      <div className="section-heading">
        <h1>{cat ? "Categorias" : "Serviços de assistência"}</h1>
        <button
          onClick={() =>
            setDraft({
              name: "",
              active: true,
              sort_order: 0,
              ...(cat ? { slug: "" } : { description: "" }),
            })
          }
        >
          Adicionar
        </button>
      </div>
      <p role="status">{message}</p>
      {draft && (
        <form
          className="panel subsection"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(`/api/admin/${resource}`, draft);
              setDraft(null);
              await load();
              setMessage("Salvo.");
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              Nome
              <input
                required
                value={String(draft.name)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    ...(cat && !draft.id ? { slug: slug(e.target.value) } : {}),
                  })
                }
              />
            </label>
            {cat ? (
              <label>
                URL amigável
                <input
                  required
                  value={String(draft.slug)}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                />
              </label>
            ) : (
              <label>
                Descrição
                <textarea
                  value={String(draft.description)}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Ordem
              <input
                type="number"
                min="0"
                value={Number(draft.sort_order)}
                onChange={(e) =>
                  setDraft({ ...draft, sort_order: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Ativo
            </label>
          </div>
          <div className="actions">
            <button disabled={busy}>Salvar</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setDraft(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ordem</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.sort_order}</td>
                  <td>{i.active ? "Ativo" : "Inativo"}</td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() =>
                        setDraft({
                          id: i.id,
                          name: i.name,
                          sort_order: i.sort_order,
                          active: i.active,
                          ...(cat
                            ? { slug: i.slug }
                            : { description: i.description }),
                        })
                      }
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
const settingNames: Record<string, string> = {
  home_show_categories: "Exibir categorias na página inicial",
  home_show_featured: "Exibir destaques",
  home_show_new: "Exibir novidades",
  home_show_bestsellers: "Exibir mais vendidos (somente vendas confirmadas)",
  home_show_service: "Exibir banner de assistência",
  service_title: "Título do banner de assistência",
  service_text: "Texto do banner de assistência",
  whatsapp: "WhatsApp internacional (somente números)",
  email: "Email de atendimento",
  pickup_address: "Endereço confirmado de retirada",
  pickup_hours: "Horários de retirada",
  origin_cep: "CEP de origem (8 números)",
  hero_title: "Título do banner inicial",
  hero_text: "Texto do banner inicial",
  about: "Informações institucionais",
  delivery_policy: "Condições de entrega e retirada",
  privacy_policy: "Política de privacidade",
  repair_terms:
    "Condições de assistência (diagnóstico, backup, dados, garantia, transporte e devolução)",
  packing_weight_g: "Peso da embalagem (g)",
  packing_padding_cm: "Folga da embalagem (cm)",
  pickup_enabled: "Ativar retirada local",
  shipping_enabled: "Ativar envio",
  payment_enabled: "Ativar Mercado Pago",
  manual_payment: "Permitir pagamento a combinar",
  terms_reviewed: "Condições de assistência revisadas e confirmadas",
};
export function SettingsAdmin() {
  const [settings, setSettings] = useState<Settings>({
    ...emptySettings,
    origin_cep: "",
  });
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    read<Settings>("settings")
      .then((rows) => {
        if (rows[0]) {
          const clean = { ...rows[0] };
          delete (clean as Settings & { id?: boolean }).id;
          setSettings(clean);
          setReady(true);
        }
      })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <>
      <h1>Configurações comerciais</h1>
      <p>
        Informações públicas, entregas, pagamentos e conteúdo da página inicial.
      </p>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/admin/settings", settings);
            setMessage("Configurações salvas.");
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {Object.entries(settingNames).map(([k, label]) => {
            const value = settings[k as keyof Settings];
            return (
              <label
                key={k}
                className={
                  [
                    "about",
                    "delivery_policy",
                    "privacy_policy",
                    "repair_terms",
                  ].includes(k)
                    ? "full"
                    : ""
                }
              >
                {typeof value === "boolean" ? (
                  <>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setSettings({ ...settings, [k]: e.target.checked })
                      }
                    />
                    {label}
                  </>
                ) : (
                  <>
                    {label}
                    {[
                      "about",
                      "delivery_policy",
                      "privacy_policy",
                      "repair_terms",
                      "hero_text",
                    ].includes(k) ? (
                      <textarea
                        value={String(value ?? "")}
                        onChange={(e) =>
                          setSettings({ ...settings, [k]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        type={typeof value === "number" ? "number" : "text"}
                        min="0"
                        value={value ?? ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [k]:
                              typeof value === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    )}
                  </>
                )}
              </label>
            );
          })}
        </div>
        <p className="notice">
          Credenciais de pagamento, frete e banco são configuradas somente nas
          variáveis de ambiente do servidor.
        </p>
        <p role="status">{message}</p>
        <button disabled={!ready || busy}>
          {busy ? "Salvando…" : "Salvar configurações"}
        </button>
      </form>
    </>
  );
}

type OperationRecord = {
  id: string;
  protocol: string;
  status: string;
  created_at: string;
  total_cents?: number;
  payment_method?: string;
  tracking?: string;
  customer?: { name: string; email: string; phone: string };
  address?: Record<string, string>;
  shipping_snapshot?: Record<string, unknown>;
  items?: {
    quantity: number;
    unit_cents: number;
    snapshot: { name: string; label: string; sku: string };
  }[];
  brand?: string;
  model?: string;
  defect?: string;
  description?: string;
  modality?: string;
  diagnosis?: string;
  estimate_cents?: number | null;
  return_cents?: number;
  deadline?: string;
  shipping_instructions?: string;
  inbound_tracking?: string;
  outbound_tracking?: string;
  tests?: string;
  technical_photos?: string[];
  photos?: string[];
  photo_urls?: string[];
  history?: {
    status: string;
    message: string;
    public: boolean;
    created_at: string;
  }[];
};
export function OperationsAdmin({
  resource,
}: {
  resource: "orders" | "repairs";
}) {
  const [items, setItems] = useState<OperationRecord[]>([]);
  const [selected, setSelected] = useState<OperationRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(true);
  async function load() {
    try {
      setItems(await read<OperationRecord>(resource));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    read<OperationRecord>(resource)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [resource]);
  const repair = resource === "repairs";
  const labels = repair ? repairLabels : orderLabels;
  return (
    <>
      <h1>{repair ? "Assistência e orçamentos" : "Pedidos e clientes"}</h1>
      <p>Registros reais. São exibidos os 200 mais recentes.</p>
      <p role="status" className={message ? "notice" : ""}>
        {message}
      </p>
      {selected && (
        <form
          className="panel subsection"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const payload = repair
                ? {
                    id: selected.id,
                    status: selected.status,
                    diagnosis: selected.diagnosis ?? "",
                    estimate_cents: selected.estimate_cents ?? null,
                    return_cents: selected.return_cents ?? 0,
                    deadline: selected.deadline ?? "",
                    shipping_instructions: selected.shipping_instructions ?? "",
                    inbound_tracking: selected.inbound_tracking ?? "",
                    outbound_tracking: selected.outbound_tracking ?? "",
                    tests: selected.tests ?? "",
                    technical_photos: selected.technical_photos ?? [],
                    message: note,
                    public: visible,
                  }
                : {
                    id: selected.id,
                    status: selected.status,
                    tracking: selected.tracking ?? "",
                  };
              await api(`/api/admin/${resource}`, payload);
              setSelected(null);
              setMessage("Atualização registrada.");
              await load();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{selected.protocol}</h2>
          <p>
            Cliente: {selected.customer?.name} · {selected.customer?.phone} ·{" "}
            {selected.customer?.email}
          </p>
          {selected.address && (
            <p>Endereço: {Object.values(selected.address).join(", ")}</p>
          )}
          {!repair && (
            <>
              <p>
                Total: {money(selected.total_cents ?? 0)} ·{" "}
                {selected.payment_method === "manual"
                  ? "Pagamento a combinar"
                  : "Mercado Pago"}
              </p>
              {selected.items?.map((i, n) => (
                <p key={n}>
                  {i.snapshot.name} — {i.snapshot.label} · {i.snapshot.sku} ·{" "}
                  {i.quantity} un. · {money(i.unit_cents * i.quantity)}
                </p>
              ))}
              <pre>{JSON.stringify(selected.shipping_snapshot, null, 2)}</pre>
            </>
          )}
          {repair && (
            <p>
              {selected.brand} {selected.model} ·{" "}
              {selected.modality === "mail"
                ? "Envio pelos Correios"
                : "Presencial"}
              <br />
              {selected.defect}
              <br />
              {selected.description}
            </p>
          )}
          <div className="form-grid">
            <label>
              Status
              <select
                value={selected.status}
                onChange={(e) =>
                  setSelected({ ...selected, status: e.target.value })
                }
              >
                {Object.entries(labels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {!repair ? (
              <label>
                Código de rastreamento
                <input
                  value={selected.tracking ?? ""}
                  onChange={(e) =>
                    setSelected({ ...selected, tracking: e.target.value })
                  }
                />
              </label>
            ) : (
              <>
                {(
                  [
                    "diagnosis",
                    "deadline",
                    "shipping_instructions",
                    "inbound_tracking",
                    "outbound_tracking",
                    "tests",
                  ] as const
                ).map((k) => (
                  <label
                    key={k}
                    className={
                      ["diagnosis", "shipping_instructions", "tests"].includes(
                        k,
                      )
                        ? "full"
                        : ""
                    }
                  >
                    {
                      {
                        diagnosis: "Diagnóstico público",
                        deadline: "Prazo estimado",
                        shipping_instructions:
                          "Autorização e instruções de postagem",
                        inbound_tracking: "Rastreamento de entrada",
                        outbound_tracking: "Rastreamento de devolução",
                        tests: "Testes realizados",
                      }[k]
                    }
                    <textarea
                      value={selected[k] ?? ""}
                      onChange={(e) =>
                        setSelected({ ...selected, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
                {(["estimate_cents", "return_cents"] as const).map((k) => (
                  <label key={k}>
                    {k === "estimate_cents"
                      ? "Orçamento do serviço (R$)"
                      : "Frete de retorno confirmado (R$)"}
                    <input
                      type="number"
                      min="0"
                      step=".01"
                      value={
                        selected[k] === null || selected[k] === undefined
                          ? ""
                          : (selected[k] ?? 0) / 100
                      }
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [k]:
                            e.target.value === ""
                              ? null
                              : Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </label>
                ))}
                <label className="full">
                  Fotos técnicas (privadas)
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={async (e) => {
                      setBusy(true);
                      try {
                        const paths = [...(selected.technical_photos ?? [])];
                        for (const file of Array.from(e.target.files ?? [])) {
                          const r = await fetch("/api/admin/technical-photos", {
                            method: "PUT",
                            body: file,
                          });
                          const d = await r.json();
                          if (!r.ok) throw new Error(d.error);
                          paths.push(d.path);
                        }
                        setSelected({ ...selected, technical_photos: paths });
                      } catch (error) {
                        setMessage((error as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                <p>
                  {selected.technical_photos?.length ?? 0} foto(s) técnica(s)
                </p>
                <div className="upload-preview">
                  {selected.photo_urls?.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver foto {i + 1}
                    </a>
                  ))}
                </div>
                <label className="full">
                  Mensagem da atualização
                  <textarea
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                  />
                  Mensagem visível ao cliente
                </label>
                <div className="full notice">
                  Mudanças de diagnóstico ou valores exigem status “Aguardando
                  sua aprovação” e uma nova decisão do cliente. Reparos exigem
                  aprovação registrada.
                </div>
              </>
            )}
          </div>
          <div className="actions">
            <button disabled={busy}>Registrar atualização</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
          {repair && (
            <div className="timeline">
              {selected.history?.map((h, i) => (
                <div key={i}>
                  <small>
                    {h.created_at} · {h.public ? "Público" : "Interno"}
                  </small>
                  <p>{h.message}</p>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Protocolo / data</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>{repair ? "Aparelho" : "Total"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.protocol}
                  <br />
                  {new Date(i.created_at).toLocaleString("pt-BR")}
                </td>
                <td>
                  {i.customer?.name}
                  <br />
                  {i.customer?.email}
                </td>
                <td>{labels[i.status]}</td>
                <td>
                  {repair ? `${i.brand} ${i.model}` : money(i.total_cents ?? 0)}
                </td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSelected(i);
                      setNote("");
                    }}
                  >
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p>Nenhum registro.</p>}
      </div>
    </>
  );
}
export function AuditAdmin({ resource }: { resource: "audit" | "payments" }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    read<Record<string, unknown>>(resource)
      .then(setRows)
      .catch((e) => setMessage(e.message));
  }, [resource]);
  return (
    <>
      <h1>
        {resource === "audit"
          ? "Auditoria de alterações"
          : "Eventos de pagamento"}
      </h1>
      <p>
        Últimos 200 eventos. Pagamentos fora da reserva e cobranças extras
        exigem conciliação e eventual estorno no provedor.
      </p>
      <p role="status">{message}</p>
      {rows.map((r, i) => (
        <details className="panel subsection" key={i}>
          <summary>
            {String(r.created_at)} · {String(r.entity ?? r.payment_id)} ·{" "}
            {String(r.operation ?? r.result)}
          </summary>
          <pre>{JSON.stringify(r, null, 2)}</pre>
        </details>
      ))}
    </>
  );
}
