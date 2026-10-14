import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueAdminSession, readAdminSession, ADMIN_SESSION_SECONDS } from "./admin-session";
const owner = "test-owner", now=1700000000;
describe("PIN session proofs",()=>{
 beforeEach(()=>{vi.stubEnv("MCELL_ADMIN_SESSION_SECRET","test-secret-longer-than-thirty-two-characters");vi.stubEnv("MCELL_ADMIN_PIN","test-only-password");});
 afterEach(()=>vi.unstubAllEnvs());
 it("accepts a valid proof only for its owner during its bounded lifetime",()=>{const s=issueAdminSession(owner,now);expect(readAdminSession(s.token,owner,now+1)?.sub).toBe(owner);expect(readAdminSession(s.token,"another-owner",now+1)).toBeNull();expect(readAdminSession(s.token,owner,now+ADMIN_SESSION_SECONDS)).toBeNull();});
 it("rejects missing, malformed, forged and modified cookies",()=>{const s=issueAdminSession(owner,now);for(const token of [undefined,"invalid",s.token+"x","forged."+"a".repeat(64),Buffer.from(JSON.stringify({...s.proof,exp:s.proof.exp+86400})).toString("base64url")+"."+s.token.split(".")[1]])expect(readAdminSession(token,owner,now)).toBeNull();});
 it("invalidates proofs after password rotation",()=>{const s=issueAdminSession(owner,now);vi.stubEnv("MCELL_ADMIN_PIN","new-test-password");expect(readAdminSession(s.token,owner,now)).toBeNull();});
 it("fails closed if the signing secret is absent",()=>{const s=issueAdminSession(owner,now);vi.stubEnv("MCELL_ADMIN_SESSION_SECRET","");expect(readAdminSession(s.token,owner,now)).toBeNull();expect(()=>issueAdminSession(owner,now)).toThrow();});
 it("never reuses a nonce across logins",()=>{expect(issueAdminSession(owner,now).nonceHash).not.toBe(issueAdminSession(owner,now).nonceHash);});
});
