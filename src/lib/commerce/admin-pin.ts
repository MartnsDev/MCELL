import { createHash, timingSafeEqual } from "node:crypto";

// This module is imported only by server routes; the PIN belongs in private env.
export function validAdminPin(candidate: unknown, expected: string | undefined) {
  if (!expected || typeof candidate !== "string" || candidate.length > 64) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}
