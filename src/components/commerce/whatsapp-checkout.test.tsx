// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
// The unit test renders a plain image instead of invoking the Next image loader.
// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: ({ fill, ...props }: React.ComponentProps<"img"> & { fill?: boolean }) => { void fill; return <img {...props} alt={props.alt} />; } }));
import { WhatsAppCheckout } from "./whatsapp-checkout";
import { CardCartActions } from "./card-cart-actions";
import { useCart } from "@/lib/commerce/cart-store";
import { emptySettings, type Catalog, type Product } from "@/lib/commerce/types";
const v = { id: "00000000-0000-4000-8000-000000000011", product_id: "00000000-0000-4000-8000-000000000010", label: "Azul", sku: "TEST", attributes: {}, image: null, price_cents: 2490, promo_cents: null, stock: 4, active: true, weight_g: 0, height_cm: 0, width_cm: 0, length_cm: 0 };
const p: Product = { id: v.product_id, category_id: "00000000-0000-4000-8000-000000000001", name: "Produto teste", slug: "teste", description: "", brand: "", product_type: "", compatibility: "", specs: {}, images: [], featured: true, active: true, created_at: "2026-10-13", variants: [v] };
const view: Catalog = { products: [p], categories: [], services: [], settings: { ...emptySettings, whatsapp: "5511999999999" } };
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value } });
beforeEach(() => { useCart.setState({ items: [{ variant_id: v.id, quantity: 2 }] }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); useCart.setState({ items: [] }); localStorage.clear(); });
describe("manual checkout and card quantities", () => {
  it("uses only the remaining stock when adding a chosen quantity", () => {
    render(<CardCartActions product={p} />);
    const q = screen.getByRole("spinbutton", { name: "Quantidade de Produto teste" });
    fireEvent.change(q, { target: { value: "99" } });
    expect((q as HTMLInputElement).value).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho: Produto teste" }));
    expect(useCart.getState().items[0].quantity).toBe(4);
    expect((screen.getByRole("button", { name: "Adicionar ao carrinho: Produto teste" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("requires a variation choice rather than silently adding another model", () => {
    render(<CardCartActions product={{ ...p, variants: [v, { ...v, id: "00000000-0000-4000-8000-000000000012", label: "Preto" }] }} />);
    const button = screen.getByRole("button", { name: "Adicionar ao carrinho: Produto teste" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Modelo de Produto teste"), { target: { value: "00000000-0000-4000-8000-000000000012" } });
    fireEvent.click(button);
    expect(useCart.getState().items.find(i => i.variant_id.endsWith("12"))?.quantity).toBe(1);
  });
  it("keeps manual address entry available during a postcode outage and sends only IDs/quantities plus the form", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ error: "Preencha manualmente." }, { status: 503 })).mockResolvedValueOnce(Response.json({ url: "https://wa.me/5511999999999?text=example", subtotal_cents: 4980 }));
    vi.stubGlobal("fetch", fetch); const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<WhatsAppCheckout view={view} />);
    input("Nome completo", "Cliente Teste"); input("CEP", "01001000"); fireEvent.blur(screen.getByLabelText("CEP"));
    await screen.findByText("Preencha manualmente.");
    input("Rua / Avenida", "Rua Teste"); input("Número", "123"); input("Bairro", "Centro"); input("Cidade", "São Paulo"); input("UF", "SP");
    fireEvent.submit(screen.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).closest("form")!);
    await waitFor(() => expect(open).toHaveBeenCalled());
    const payload = JSON.parse(fetch.mock.calls[1][1].body);
    expect(payload.items).toEqual([{ variant_id: v.id, quantity: 2 }]);
    expect(payload.customer).toEqual({ kind: "person", name: "Cliente Teste" });
    expect(payload.address.number).toBe("123"); expect(payload).not.toHaveProperty("subtotal_cents");
    expect(screen.getByRole("link", { name: "Abrir WhatsApp com o resumo" })).toBeTruthy();
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(localStorage.getItem("martins-cell-cart-v1")).not.toContain("Cliente Teste");
    fireEvent.click(screen.getByLabelText("Empresa"));
    expect((screen.getByLabelText("CNPJ") as HTMLInputElement).required).toBe(true);
    expect(screen.queryByRole("link", { name: "Abrir WhatsApp com o resumo" })).toBeNull();
  });
  it("does not overwrite a manually edited address with an older postcode response", async () => {
    let finish!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>(r => { finish = r; })));
    render(<WhatsAppCheckout view={view} />); input("CEP", "01001000"); fireEvent.blur(screen.getByLabelText("CEP"));
    input("Rua / Avenida", "Minha rua corrigida");
    finish(Response.json({ street: "Resposta antiga", district: "Sé", city: "São Paulo", state: "SP" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Buscar CEP" }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText("Rua / Avenida") as HTMLInputElement).value).toBe("Minha rua corrigida");
  });
  it("does not prepare a message without a recipient", () => {
    render(<WhatsAppCheckout view={{ ...view, settings: emptySettings }} />);
    expect((screen.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/configurando o WhatsApp/)).toBeTruthy();
  });
});
