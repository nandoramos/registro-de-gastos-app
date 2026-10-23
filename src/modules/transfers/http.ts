import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { recordFromUnknown } from "@/modules/pending-entries/domain";
import { getTransferDetail } from "./service";
import { ingestManualTransfer } from "./workflow";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

async function readJsonRecord(request: Request) {
  try {
    return recordFromUnknown(await request.json());
  } catch {
    return undefined;
  }
}

export async function transfersCollectionResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "POST") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const original = await readJsonRecord(request);
    if (!original) {
      return Response.json(
        { error: "INVALID_JSON_OBJECT" },
        { status: 422, headers },
      );
    }
    const result = await ingestManualTransfer(db, access.userId, original);
    return result.kind === "registered"
      ? Response.json(result.transfer, { status: 201, headers })
      : Response.json(result.entry, { status: 202, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function transferResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  transferId: string,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method !== "GET") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const transfer = await getTransferDetail(db, access.userId, transferId);
    return transfer
      ? Response.json(transfer, { headers })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
