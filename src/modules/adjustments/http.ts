import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import { adaptCreateAdjustment, adaptUpdateAdjustment } from "./domain";
import { getAdjustmentDetail, registerManualAdjustment, updateManualAdjustment, type AdjustmentsDatabase } from "./service";

const headers = { "Cache-Control": "no-store" };
async function readBody(request: Request) { try { return await request.json(); } catch { return undefined; } }
function denied(status: "unauthenticated" | "forbidden") { return Response.json({ error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" }, { status: status === "unauthenticated" ? 401 : 403, headers }); }

export async function adjustmentCollectionResponse<T extends PgQueryResultHKT>(request: Request, db: AdjustmentsDatabase<T>, getAccess: GetAccess) {
  const access = await getAccess(request.headers);
  if (access.status !== "authorized") return denied(access.status);
  if (request.method !== "POST") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
  const adapted = adaptCreateAdjustment(await readBody(request));
  if (!adapted.ok) return Response.json({ error: adapted.error }, { status: 422, headers });
  const result = await registerManualAdjustment(db, access.userId, adapted.value);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422, headers });
  if (result.status === "already_equal") return Response.json({ status: "already_equal" }, { headers });
  return Response.json(result.adjustment, { status: 201, headers });
}

export async function adjustmentResourceResponse<T extends PgQueryResultHKT>(request: Request, id: string, db: AdjustmentsDatabase<T>, getAccess: GetAccess) {
  const access = await getAccess(request.headers);
  if (access.status !== "authorized") return denied(access.status);
  if (request.method === "GET") {
    const adjustment = await getAdjustmentDetail(db, access.userId, id);
    return adjustment ? Response.json(adjustment, { headers }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
  if (request.method !== "PATCH") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
  const adapted = adaptUpdateAdjustment(await readBody(request));
  if (!adapted.ok) return Response.json({ error: adapted.error }, { status: 422, headers });
  const result = await updateManualAdjustment(db, access.userId, id, adapted.value);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422, headers });
  return Response.json(result.adjustment, { headers });
}
