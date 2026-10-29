import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { recordFromUnknown } from "@/modules/pending-entries/domain";
import { validateQuoteSettings } from "./domain";
import { getQuoteSettings, saveQuoteSettings } from "./service";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

export async function quoteSettingsResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: ExpensesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "GET") {
      return Response.json(await getQuoteSettings(db, access.userId), { headers });
    }
    if (request.method !== "PATCH") {
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
    }
    let input;
    try {
      input = recordFromUnknown(await request.json());
    } catch {
      input = undefined;
    }
    if (!input) return Response.json({ error: "INVALID_JSON_OBJECT" }, { status: 422, headers });
    const result = validateQuoteSettings(input);
    if (!result.ok) {
      const issue = result.errors[0];
      return Response.json({ error: issue }, { status: 422, headers });
    }
    const saved = await saveQuoteSettings(db, access.userId, result.value);
    return Response.json(saved, { headers });
  } catch {
    return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers });
  }
}
