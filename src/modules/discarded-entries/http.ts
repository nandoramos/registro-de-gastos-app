import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import {
  discardPendingEntry,
  getDiscardedEntry,
  listDiscardedEntries,
  recoverDiscardedEntry,
} from "./service";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

export async function pendingEntryDiscardResponse<T extends PgQueryResultHKT>(
  request: Request,
  id: string,
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
    const entry = await discardPendingEntry(db, access.userId, id);
    return entry
      ? Response.json(entry, { headers })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function discardedEntriesCollectionResponse<
  T extends PgQueryResultHKT,
>(
  request: Request,
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
    const entries = await listDiscardedEntries(db, access.userId);
    return Response.json({ count: entries.length, entries }, { headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function discardedEntryResourceResponse<
  T extends PgQueryResultHKT,
>(
  request: Request,
  id: string,
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
    const entry = await getDiscardedEntry(db, access.userId, id);
    return entry
      ? Response.json(entry, { headers })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function discardedEntryRecoverResponse<T extends PgQueryResultHKT>(
  request: Request,
  id: string,
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
    const entry = await recoverDiscardedEntry(db, access.userId, id);
    return entry
      ? Response.json(entry, { headers })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
