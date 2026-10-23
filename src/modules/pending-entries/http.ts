import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { recordFromUnknown } from "./domain";
import { getPendingEntry, listPendingEntries } from "./service";
import { ingestManualCandidate, reviewPendingCandidate } from "./workflow";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

async function readJsonRecord(
  request: Request,
): Promise<Record<string, unknown> | undefined> {
  try {
    return recordFromUnknown(await request.json());
  } catch {
    return undefined;
  }
}

export async function pendingEntriesCollectionResponse<
  T extends PgQueryResultHKT,
>(
  request: Request,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "GET") {
      const entries = await listPendingEntries(db, access.userId);
      return Response.json({ count: entries.length, entries }, { headers });
    }
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
    const result = await ingestManualCandidate(db, access.userId, original);
    return result.kind === "registered"
      ? Response.json(result.expense, { status: 201, headers })
      : Response.json(result.entry, { status: 202, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function pendingEntryResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  id: string,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "GET") {
      const entry = await getPendingEntry(db, access.userId, id);
      return entry
        ? Response.json(entry, { headers })
        : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (request.method !== "PATCH") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const correction = await readJsonRecord(request);
    if (!correction) {
      return Response.json(
        { error: "INVALID_JSON_OBJECT" },
        { status: 422, headers },
      );
    }
    const result = await reviewPendingCandidate(
      db,
      access.userId,
      id,
      correction,
    );
    if (result.kind === "not-found") {
      return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (result.kind === "pending") {
      return Response.json(result.entry, { headers });
    }
    if (result.kind === "registered-transfer") {
      return Response.json(
        {
          status: "registered",
          reviewedAt: result.reviewedAt,
          transfer: result.transfer,
        },
        { status: 201, headers },
      );
    }
    return Response.json(
      {
        status: "registered",
        reviewedAt: result.reviewedAt,
        expense: result.expense,
      },
      { status: 201, headers },
    );
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
