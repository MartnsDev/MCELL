import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  config: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseConfig: mocks.config }));
import AdminLayout from "./layout";

describe("admin pages server authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.mockReturnValue({
      url: "https://example.supabase.co",
      key: "public-test-key",
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
  });
  it("does not render admin content for a missing or invalid session", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid session" },
    });
    await expect(
      AdminLayout({ children: "private admin content" }),
    ).rejects.toThrow("REDIRECT:/entrar");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("denies an authenticated non-admin", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(
      AdminLayout({ children: "private admin content" }),
    ).rejects.toThrow("REDIRECT:/conta");
  });
  it("fails closed when the permission lookup fails", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Unavailable" },
    });
    await expect(
      AdminLayout({ children: "private admin content" }),
    ).rejects.toThrow("REDIRECT:/conta");
  });
  it("renders admin content only after server-verified permission", async () => {
    const result = await AdminLayout({ children: "private admin content" });
    expect(JSON.stringify(result)).toContain("private admin content");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("is_admin");
  });
});
