import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { recordFromUnknown } from "@/modules/pending-entries/domain";
import { getConversionDetail } from "./service";
import { ingestManualConversion } from "./workflow";

const headers = { "Cache-Control": "no-store" };
function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}
async function readRecord(request: Request) {
  try {
    return recordFromUnknown(await request.json());
  } catch {
    return undefined;
  }
}

export async function conversionsCollectionResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
) {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "POST") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const original = await readRecord(request);
    if (!original) {
      return Response.json(
        { error: "INVALID_JSON_OBJECT" },
        { status: 422, headers },
      );
    }
    const result = await ingestManualConversion(db, access.userId, original);
    return result.kind === "registered"
      ? Response.json(result.conversion, { status: 201, headers })
      : Response.json(result.entry, { status: 202, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function conversionResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  id: string,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
) {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "GET") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const conversion = await getConversionDetail(db, access.userId, id);
    return conversion
      ? Response.json(conversion, { headers })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
