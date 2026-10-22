import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import {
  registerManualExpense,
  type ExpensesDatabase,
} from "@/modules/expenses/service";
import { analyzePendingExpense, recordFromUnknown } from "./domain";
import {
  completePendingEntry,
  createPendingEntry,
  getPendingEntry,
  listPendingEntries,
  updatePendingInterpretation,
} from "./service";

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
    const analysis = analyzePendingExpense(original);
    if (analysis.complete) {
      const result = await registerManualExpense(
        db,
        access.userId,
        analysis.expense,
        original,
      );
      if (!result.ok) {
        const pending = await createPendingEntry(
          db,
          access.userId,
          original,
          analysis.interpretation,
          [result.error],
        );
        return Response.json(pending, { status: 202, headers });
      }
      return Response.json(result.expense, { status: 201, headers });
    }
    const pending = await createPendingEntry(
      db,
      access.userId,
      original,
      analysis.interpretation,
      analysis.issues,
    );
    return Response.json(pending, { status: 202, headers });
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
    const analysis = analyzePendingExpense(correction);
    if (!analysis.complete) {
      const pending = await updatePendingInterpretation(
        db,
        access.userId,
        id,
        analysis.interpretation,
        analysis.issues,
      );
      return pending
        ? Response.json(pending, { headers })
        : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    const completed = await completePendingEntry(
      db,
      access.userId,
      id,
      analysis.expense,
      analysis.interpretation,
    );
    if (!completed.ok) {
      if (completed.error === "NOT_FOUND") {
        return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
      }
      const pending = await updatePendingInterpretation(
        db,
        access.userId,
        id,
        analysis.interpretation,
        [completed.error],
      );
      return Response.json(pending, { headers });
    }
    return Response.json(
      {
        status: "registered",
        reviewedAt: completed.reviewedAt,
        expense: completed.expense,
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
