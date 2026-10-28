import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import { adaptManualIncome } from "./domain";
import {
  getIncomeDetail,
  registerManualIncome,
  updateIncome,
  type IncomesDatabase,
} from "./service";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function incomesCollectionResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: IncomesDatabase<T>,
  getAccess: GetAccess,
) {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "POST") {
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
    }
    const adapted = adaptManualIncome(await readJsonBody(request));
    if (!adapted.ok) return Response.json({ error: adapted.error }, { status: 422, headers });
    const result = await registerManualIncome(db, access.userId, adapted.value.income, adapted.value.original);
    if (!result.ok) return Response.json({ error: result.error }, { status: 422, headers });
    return Response.json(result.income, { status: 201, headers });
  } catch {
    return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers });
  }
}

export async function incomeResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  incomeId: string,
  db: IncomesDatabase<T>,
  getAccess: GetAccess,
) {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "GET" && request.method !== "PATCH") {
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
    }
    if (request.method === "PATCH") {
      const adapted = adaptManualIncome(await readJsonBody(request));
      if (!adapted.ok) return Response.json({ error: adapted.error }, { status: 422, headers });
      const result = await updateIncome(db, access.userId, incomeId, adapted.value.income);
      if (!result.ok) {
        const status = result.error === "NOT_FOUND" ? 404 : 422;
        return Response.json({ error: result.error }, { status, headers });
      }
      return Response.json(result.income, { headers });
    }
    const income = await getIncomeDetail(db, access.userId, incomeId);
    if (!income) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    return Response.json(income, { headers });
  } catch {
    return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers });
  }
}
