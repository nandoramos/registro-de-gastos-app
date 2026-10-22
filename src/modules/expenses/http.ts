import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import { adaptManualExpense } from "./domain";
import {
  getExpenseDetail,
  registerManualExpense,
  type ExpensesDatabase,
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

export async function expensesCollectionResponse<T extends PgQueryResultHKT>(
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
    const adapted = adaptManualExpense(await readJsonBody(request));
    if (!adapted.ok) {
      return Response.json({ error: adapted.error }, { status: 422, headers });
    }
    const result = await registerManualExpense(
      db,
      access.userId,
      adapted.value.expense,
      adapted.value.original,
    );
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 422, headers });
    }
    return Response.json(result.expense, { status: 201, headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function expenseResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  expenseId: string,
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
    const expense = await getExpenseDetail(db, access.userId, expenseId);
    if (!expense) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    return Response.json(expense, { headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
