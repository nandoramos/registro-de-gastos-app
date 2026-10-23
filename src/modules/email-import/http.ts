import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { recordFromUnknown } from "@/modules/pending-entries/domain";
import { ingestEmailCandidate } from "./workflow";

const headers = { "Cache-Control": "no-store" };

export async function emailEntriesCollectionResponse<
  T extends PgQueryResultHKT,
>(request: Request, db: ExpensesDatabase<T>, getAccess: GetAccess) {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") {
      return Response.json(
        {
          error:
            access.status === "unauthenticated"
              ? "UNAUTHENTICATED"
              : "FORBIDDEN",
        },
        { status: access.status === "unauthenticated" ? 401 : 403, headers },
      );
    }
    if (request.method !== "POST") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const body = recordFromUnknown(await request.json());
    if (
      !body ||
      typeof body.text !== "string" ||
      !body.text.trim() ||
      body.text.length > 100_000
    ) {
      return Response.json(
        { error: "INVALID_EMAIL_TEXT" },
        { status: 422, headers },
      );
    }
    const result = await ingestEmailCandidate(db, access.userId, {
      text: body.text,
      accountId:
        typeof body.accountId === "string" ? body.accountId : undefined,
      categoryId:
        typeof body.categoryId === "string" ? body.categoryId : undefined,
      nature:
        body.nature === "expense" || body.nature === "own-transfer"
          ? body.nature
          : undefined,
    });
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
