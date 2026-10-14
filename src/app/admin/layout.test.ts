import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({authorize:vi.fn()}));
vi.mock("@/lib/commerce/server",()=>({requireAdmin:mocks.authorize}));
vi.mock("next/navigation",()=>({redirect:(path:string)=>{throw new Error(`REDIRECT:${path}`);},usePathname:()=>"/admin"}));
import AdminLayout from "./layout";
describe("admin pages require the same PIN gate as APIs",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it.each(["missing login","missing PIN proof","expired proof","permission lookup unavailable"])("never renders private content with %s",async reason=>{mocks.authorize.mockRejectedValue(new Error(reason));await expect(AdminLayout({children:"private content"})).rejects.toThrow("REDIRECT:/adm/1031825277");});
 it("renders the administrative shell only after full authorization",async()=>{mocks.authorize.mockResolvedValue({});const result=await AdminLayout({children:"private content"});expect(JSON.stringify(result)).toContain("private content");expect(mocks.authorize).toHaveBeenCalledOnce();});
});
