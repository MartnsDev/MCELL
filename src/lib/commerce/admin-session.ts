import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const adminCookieName = () => process.env.NODE_ENV === "production" ? "__Host-mcell-admin" : "mcell-admin";
type Proof = { sub: string; nonce: string; iat: number; exp: number };
function key() {
  const secret = process.env.MCELL_ADMIN_SESSION_SECRET;
  const pin = process.env.MCELL_ADMIN_PIN;
  if (!secret || secret.length < 32 || !pin) return null;
  return createHmac("sha256", secret).update(`mcell-admin-v1:${pin}`).digest();
}
export const sessionHash = (nonce: string) => createHash("sha256").update(nonce).digest("hex");
export function issueAdminSession(owner: string, now = Math.floor(Date.now()/1000)) {
  const secret = key();
  if (!secret || !owner) throw new Error("Admin session is not configured");
  const proof: Proof = { sub: owner, nonce: randomBytes(32).toString("hex"), iat: now, exp: now + ADMIN_SESSION_SECONDS };
  const payload = Buffer.from(JSON.stringify(proof)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${payload}.${signature}`, proof, nonceHash: sessionHash(proof.nonce) };
}
export function readAdminSession(token: string | undefined, owner: string, now = Math.floor(Date.now()/1000)): Proof | null {
  const secret = key();
  if (!secret || !owner || !token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
  const signature = createHmac("sha256", secret).update(parts[0]).digest();
  if (!timingSafeEqual(signature, Buffer.from(parts[1], "hex"))) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Proof;
    if (p.sub !== owner || !/^[a-f0-9]{64}$/.test(p.nonce) || !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) || p.iat > now + 60 || p.exp - p.iat !== ADMIN_SESSION_SECONDS || p.exp <= now) return null;
    return p;
  } catch { return null; }
}
export function adminCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: ADMIN_SESSION_SECONDS };
}
