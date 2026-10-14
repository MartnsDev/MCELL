import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), catalog: vi.fn() }));
vi.mock("@/lib/commerce/server", async importOriginal => ({ ...await importOriginal<typeof import("./server")>(), guard: mocks.guard, catalog: mocks.catalog }));
import { POST } from "@/app/api/commerce/[action]/route";
const call = (action: string, body: unknown) => POST(new Request(`https://mcell.example/api/commerce/${action}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://mcell.example" }, body: JSON.stringify(body) }), { params: Promise.resolve({ action }) });
beforeEach(() => { mocks.guard.mockReset(); mocks.guard.mockResolvedValue({}); mocks.catalog.mockReset(); });
afterEach(() => vi.unstubAllGlobals());
describe("postcode lookup", () => {
  it("rejects malformed CEP before calling the provider", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await call("postcode", { cep: "../invalid" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns only address fields from a fixed provider URL", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP", ibge: "ignored" })); vi.stubGlobal("fetch", fetch);
    const r = await call("postcode", { cep: "01001000" });
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ street: "Praça da Sé", district: "Sé", city: "São Paulo", state: "SP" });
    expect(fetch.mock.calls[0][0]).toBe("https://viacep.com.br/ws/01001000/json/");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
  it("lets the customer correct an unknown CEP or use manual address entry during outages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ erro: true })));
    expect((await call("postcode", { cep: "99999999" })).status).toBe(404);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const r = await call("postcode", { cep: "01001000" }); expect(r.status).toBe(503); expect(await r.text()).toContain("manualmente");
  });
});
