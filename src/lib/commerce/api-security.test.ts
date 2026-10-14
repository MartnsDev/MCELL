import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), cookie: vi.fn(), stamp: vi.fn() }));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({from:()=>({select:()=>({eq:()=>({eq:()=>({gt:()=>({maybeSingle:mocks.stamp})})})})})})}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mocks.user }, rpc: mocks.rpc }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get:mocks.cookie, set: vi.fn() }),
}));
vi.mock("@/lib/supabase-config", () => ({
  getSupabaseConfig: () => ({
    url: "https://test.supabase.co",
    key: "test-public",
  }),
}));
import { GET, POST, PUT } from "@/app/api/admin/[resource]/route";
import { POST as webhook } from "@/app/api/payments/webhook/route";
import { POST as expire } from "@/app/api/cron/expire/route";
import { issueAdminSession } from "./admin-session";
import { body, requireAdmin, StoreError } from "./server";
import { safeImage } from "./uploads";
import sharp from "sharp";
const context = { params: Promise.resolve({ resource: "products" }) };
describe("administrative API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  });
  it.each(["GET", "POST", "PUT"])(
    "denies anonymous %s before reading or writing records",
    async (method) => {
      const handler = { GET, POST, PUT }[method as "GET" | "POST" | "PUT"];
      const response = await handler(
        new Request("http://localhost/api/admin/products", { method }),
        context,
      );
      expect(response.status).toBe(401);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it("keeps prepared product costs private from anonymous users", async () => {
    const response = await GET(new Request("http://localhost/api/admin/product-imports"), {
      params: Promise.resolve({ resource: "product-imports" }),
    });
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("cost_cents");
  });
  it("denies authenticated customers and fails closed on role errors", async () => {
    mocks.user.mockResolvedValue({
      data: { user: { id: "customer" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(
      (await GET(new Request("http://localhost/api/admin/products"), context))
        .status,
    ).toBe(403);
    mocks.rpc.mockResolvedValue({ data: true, error: { message: "offline" } });
    expect(
      (await GET(new Request("http://localhost/api/admin/products"), context))
        .status,
    ).toBe(403);
  });
});
describe("request and upload safety", () => {
  it("limits actual JSON request bytes without trusting Content-Length", async () => {
    await expect(
      body(
        new Request("http://localhost", {
          method: "POST",
          body: "a".repeat(100001),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects HTML and corrupt images despite image MIME", async () => {
    await expect(
      safeImage(
        new Request("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "image/png" },
          body: "<script>alert(1)</script>",
        }),
      ),
    ).rejects.toBeInstanceOf(StoreError);
    await expect(
      safeImage(
        new Request("http://localhost", {
          method: "PUT",
          body: new Uint8Array([255, 216, 255, 0]),
        }),
      ),
    ).rejects.toThrow("não pôde ser lida");
  });
  it("decodes and normalizes images to WebP before storage", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#abcdef" },
    })
      .png()
      .toBuffer();
    const r = await safeImage(
      new Request("http://localhost", {
        method: "PUT",
        body: new Uint8Array(png),
      }),
    );
    expect(r.mime).toBe("image/webp");
    expect(r.bytes.toString("ascii", 8, 12)).toBe("WEBP");
  });
  it("rejects unsigned payment notifications before API/database calls", async () => {
    const r = await webhook(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        body: JSON.stringify({ type: "payment", data: { id: "123" } }),
      }),
    );
    expect(r.status).toBe(401);
  });
  it("rejects an unauthenticated expiration job", async () => {
    const r = await expire(
      new Request("http://localhost/api/cron/expire", { method: "POST" }),
    );
    expect(r.status).toBe(401);
  });
});


describe("quick stock authorization", () => {
  it("rejects anonymous stock mutations before accessing inventory", async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(new Request("https://shop.example/api/admin/stock", { method: "POST", body: "{}" }), { params: Promise.resolve({ resource: "stock" }) });
    expect(response.status).toBe(401);
  });
});


it("reads bounded URL-encoded admin login bodies only when explicitly enabled", async () => {
  const request = () => new Request("https://shop.example/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "pin=test-only" });
  await expect(body(request(), true)).resolves.toEqual({ pin: "test-only" });
  await expect(body(request())).rejects.toThrow("JSON inválido");
});


describe("PIN proof required for administrative access",()=>{
 beforeEach(()=>{
  vi.stubEnv("MCELL_ADMIN_SESSION_SECRET","test-secret-longer-than-thirty-two-characters");vi.stubEnv("MCELL_ADMIN_PIN","test-only-password");vi.stubEnv("MCELL_ADMIN_USER_ID","owner");vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","test-server-key");
  mocks.user.mockResolvedValue({data:{user:{id:"owner"}},error:null});mocks.rpc.mockResolvedValue({data:true,error:null});mocks.cookie.mockReturnValue(undefined);mocks.stamp.mockResolvedValue({data:{nonce_hash:"present"},error:null});
 });
 afterEach(()=>vi.unstubAllEnvs());
 it.each(["products","categories","orders","repairs","settings","audit","product-imports"])("denies a Supabase admin without the PIN cookie for %s",async resource=>{
  const r=await GET(new Request(`https://shop.example/api/admin/${resource}`),{params:Promise.resolve({resource})});expect(r.status).toBe(401);
 });
 it("rejects a forged proof cookie",async()=>{mocks.cookie.mockReturnValue({value:"forged"});await expect(requireAdmin()).rejects.toMatchObject({status:401});});
 it("rejects a signed but revoked proof",async()=>{mocks.cookie.mockReturnValue({value:issueAdminSession("owner").token});mocks.stamp.mockResolvedValue({data:null,error:null});await expect(requireAdmin()).rejects.toMatchObject({status:401});});
 it("fails closed if the proof lookup is unavailable",async()=>{mocks.cookie.mockReturnValue({value:issueAdminSession("owner").token});mocks.stamp.mockResolvedValue({data:null,error:{message:"offline"}});await expect(requireAdmin()).rejects.toMatchObject({status:401});});
 it("accepts only a valid unexpired proof that is still registered",async()=>{mocks.cookie.mockReturnValue({value:issueAdminSession("owner").token});await expect(requireAdmin()).resolves.toBeTruthy();});
});
