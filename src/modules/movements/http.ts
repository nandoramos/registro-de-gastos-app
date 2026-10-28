import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { changeMovementStatus, type MovementAction, type MovementType } from "./status";

type Access = (headers: Headers) => Promise<{ status: "authorized"; userId: string } | { status: "unauthenticated" | "forbidden" }>;
export async function movementStatusResponse<T extends PgQueryResultHKT>(request: Request, type: string, id: string, action: string, db: ExpensesDatabase<T>, getAccess: Access) {
  const access = await getAccess(request.headers);
  if (access.status !== "authorized") return Response.json({ error: access.status.toUpperCase() }, { status: access.status === "unauthenticated" ? 401 : 403 });
  if (!(["expense", "income", "transfer", "conversion"] as string[]).includes(type) || !(["void", "restore"] as string[]).includes(action)) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const result = await changeMovementStatus(db, access.userId, type as MovementType, id, action as MovementAction);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422 });
  return Response.json({ status: action === "void" ? "voided" : "active", changed: result.changed });
}
