import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({ guard:vi.fn(),rpc:vi.fn(),membership:vi.fn(),owner:vi.fn(),link:vi.fn(),verify:vi.fn(),role:vi.fn(),signOut:vi.fn(),insert:vi.fn(),cookieGet:vi.fn(),cookieSet:vi.fn(),removed:vi.fn() }));
vi.mock("next/headers",()=>({cookies:async()=>({get:m.cookieGet,set:m.cookieSet})}));
vi.mock("@/lib/commerce/server",()=>{
  class StoreError extends Error { constructor(message:string,public status=400){super(message);} }
  const db={from:()=>({delete:()=>({eq:()=>({eq:m.removed})})})};
  return {database:()=>db,StoreError,body:async(r:Request)=>r.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(await r.text())) : r.json(),hash:(s:string)=>s,guard:m.guard,sessionClient:async()=>({auth:{verifyOtp:m.verify,signOut:m.signOut},rpc:m.role}),failure:(e:Error & {status?:number})=>Response.json({error:e.message},{status:e.status??500}),};
});
import {POST} from "@/app/api/adm/1031825277/route";
import {validAdminPin} from "./admin-pin";
import {issueAdminSession} from "./admin-session";
const ownerId="00000000-0000-4000-8000-000000000001";
const secret="test-only-pin";
const request=(data:unknown={pin:secret},origin="https://mcell.example")=>new Request("https://mcell.example/api/adm/1031825277",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(data)});
describe("manual admin login",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv("MCELL_ADMIN_PIN",secret);vi.stubEnv("MCELL_ADMIN_USER_ID",ownerId);vi.stubEnv("MCELL_ADMIN_SESSION_SECRET","test-secret-longer-than-thirty-two-characters");m.cookieGet.mockReturnValue(undefined);m.insert.mockResolvedValue({error:null});m.removed.mockResolvedValue({error:null});
  m.guard.mockResolvedValue({rpc:m.rpc,from:(table:string)=>table==="admin_users"?({select:()=>({eq:()=>({maybeSingle:m.membership})})}):({insert:m.insert}),auth:{admin:{getUserById:m.owner,generateLink:m.link}}});
  m.rpc.mockResolvedValue({data:true,error:null});m.membership.mockResolvedValue({data:{user_id:ownerId},error:null});
  m.owner.mockResolvedValue({data:{user:{id:ownerId,email:"owner@example.test"}},error:null});
  m.link.mockResolvedValue({data:{user:{id:ownerId},properties:{hashed_token:"internal-only-token"}},error:null});
  m.verify.mockResolvedValue({data:{user:{id:ownerId}},error:null});m.role.mockResolvedValue({data:true,error:null});m.signOut.mockResolvedValue({error:null});
 });
 afterEach(()=>vi.unstubAllEnvs());
 it("never accepts missing configuration or malformed input",()=>{
  expect(validAdminPin(secret,undefined)).toBe(false);expect(validAdminPin(null,secret)).toBe(false);expect(validAdminPin(secret+"x",secret)).toBe(false);expect(validAdminPin(secret,secret)).toBe(true);
 });
 it("rejects cross-origin login before privileged access",async()=>{
  expect((await POST(request(undefined,"https://other.example"))).status).toBe(403);expect(m.guard).not.toHaveBeenCalled();
 });
 it("fails closed when the owner is not configured",async()=>{
  vi.stubEnv("MCELL_ADMIN_USER_ID","");expect((await POST(request())).status).toBe(503);expect(m.guard).not.toHaveBeenCalled();
 });
 it("does not generate sessions for a wrong PIN",async()=>{
  expect((await POST(request({pin:"wrong"}))).status).toBe(401);expect(m.owner).not.toHaveBeenCalled();expect(m.verify).not.toHaveBeenCalled();
 });
 it("denies rate-limited attempts even with a correct PIN",async()=>{
  m.rpc.mockResolvedValue({data:false,error:null});expect((await POST(request())).status).toBe(429);expect(m.link).not.toHaveBeenCalled();
 });
 it("requires the explicitly configured owner to be an existing admin",async()=>{
  m.membership.mockResolvedValue({data:null,error:null});expect((await POST(request())).status).toBe(503);expect(m.link).not.toHaveBeenCalled();
 });
 it("rejects a token for a different identity",async()=>{
  m.link.mockResolvedValue({data:{user:{id:"other"},properties:{hashed_token:"internal-only-token"}},error:null});expect((await POST(request())).status).toBe(503);expect(m.verify).not.toHaveBeenCalled();
 });
 it("clears a newly verified session if RLS admin validation fails",async()=>{
  m.role.mockResolvedValue({data:false,error:null});expect((await POST(request())).status).toBe(403);expect(m.signOut).toHaveBeenCalledWith({scope:"local"});
 });
 it("returns no token, password or owner information on successful login",async()=>{
  const r=await POST(request());expect(r.status).toBe(200);expect(await r.json()).toEqual({next:"/adm/1031825277"});expect(m.verify).toHaveBeenCalledWith({token_hash:"internal-only-token",type:"email"});
 });
 it("handles a native POST form without placing the PIN in the redirect URL",async()=>{
  const r=await POST(new Request("https://mcell.example/api/adm/1031825277",{method:"POST",headers:{origin:"https://mcell.example","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({pin:secret})}));
  expect(r.status).toBe(303);expect(r.headers.get("location")).toBe("/adm/1031825277");
 });
 it("redirects a rejected native form with only a fixed error code",async()=>{
  const r=await POST(new Request("https://mcell.example/api/adm/1031825277",{method:"POST",headers:{origin:"https://mcell.example","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({pin:"wrong"})}));
  expect(r.status).toBe(303);expect(r.headers.get("location")).toBe("/adm/1031825277?error=login");
 });
 it("does not grant access if the revocable proof cannot be stored",async()=>{
  m.insert.mockResolvedValue({error:{message:"offline"}});expect((await POST(request())).status).toBe(503);expect(m.cookieSet).not.toHaveBeenCalled();expect(m.signOut).toHaveBeenCalledWith({scope:"local"});
 });
 it("revokes the stored proof and clears the protected cookie on logout",async()=>{
  m.cookieGet.mockReturnValue({value:issueAdminSession(ownerId).token});expect((await POST(request({action:"logout"}))).status).toBe(200);expect(m.removed).toHaveBeenCalledWith("user_id",ownerId);expect(m.cookieSet).toHaveBeenCalledWith(expect.any(String),"",expect.objectContaining({httpOnly:true,sameSite:"strict",maxAge:0}));
 });
 it("allows same-origin logout without privileged database access",async()=>{
  expect((await POST(request({action:"logout"}))).status).toBe(200);expect(m.signOut).toHaveBeenCalledWith({scope:"local"});expect(m.guard).not.toHaveBeenCalled();
 });
});
