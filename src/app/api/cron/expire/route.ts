import { timingSafeEqual } from "node:crypto";
import { check, database, failure, StoreError } from "@/lib/commerce/server";
export async function POST(request: Request) {
  try {
    const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
    const actual = request.headers.get("authorization") ?? "";
    if (
      !process.env.CRON_SECRET ||
      actual.length !== expected.length ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
      throw new StoreError("Não autorizado.", 401);
    const result = await database().rpc("mc_expire_orders");
    check(result.error);
    return Response.json({ expired: result.data });
  } catch (e) {
    return failure(e);
  }
}
