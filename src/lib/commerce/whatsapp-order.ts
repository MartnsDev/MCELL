import { z } from "zod";
import { addressSchema, cartSchema } from "./validation";
import { resolveCart, subtotal } from "./cart";
import { money, type Catalog } from "./types";

const singleLine = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\r\n\u0000-\u001f]/.test(v), "Use uma única linha.");
export const whatsappOrderSchema = z.object({
  items: cartSchema,
  customer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("person"), name: singleLine(120) }).strict(),
    z.object({ kind: z.literal("company"), name: singleLine(120), cnpj: z.string().transform(v => v.replace(/[.\/\-\s]/g, "").toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{12}\d{2}$/, "Informe um CNPJ com 14 posições.")) }).strict(),
  ]),
  address: addressSchema.extend({ street: singleLine(200), number: singleLine(20), district: singleLine(200), city: singleLine(200), complement: z.string().trim().max(100).refine(v => !/[\r\n\u0000-\u001f]/.test(v), "Use uma única linha.") }),
}).strict();
export function prepareWhatsAppOrder(raw: unknown, view: Catalog) {
  const input = whatsappOrderSchema.parse(raw);
  const phone = view.settings.whatsapp.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(phone)) throw new Error("O WhatsApp da loja ainda não está configurado.");
  if (view.unavailable) throw new Error("O catálogo está indisponível. Tente novamente.");
  const lines = resolveCart(input.items, view.products);
  const amount = subtotal(lines);
  const a = input.address;
  const message = [
    "Olá! Quero fazer um pedido na M'Cell.", "", "PRODUTOS",
    ...lines.map(l => `${l.quantity}x ${l.product.name} — ${l.variant.label} (SKU ${l.variant.sku}) | ${money(l.unit_cents)} cada | ${money(l.unit_cents * l.quantity)}`),
    "", `Subtotal dos produtos: ${money(amount)}`, "Frete: a confirmar com a loja.", "",
    input.customer.kind === "company" ? `Razão social: ${input.customer.name}\nCNPJ: ${input.customer.cnpj}` : `Nome: ${input.customer.name}`,
    "", "ENDEREÇO PARA ENTREGA", `CEP: ${a.cep.slice(0,5)}-${a.cep.slice(5)}`,
    `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""}`,
    `${a.district} — ${a.city}/${a.state}`, "",
    "Aguardo a confirmação de disponibilidade, frete e forma de pagamento. Esta mensagem não reserva estoque nem confirma pagamento.",
  ].join("\n");
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`, subtotal_cents: amount };
}
