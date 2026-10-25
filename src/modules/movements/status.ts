import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";

export type MovementType = "expense" | "transfer" | "conversion";
export type MovementAction = "void" | "restore";

const tables = {
  expense: schema.expense,
  transfer: schema.ownTransfer,
  conversion: schema.currencyConversion,
} as const;

export async function changeMovementStatus<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  movementType: MovementType,
  movementId: string,
  action: MovementAction,
) {
  const table = tables[movementType];
  return db.transaction(async (transaction) => {
    const [movement] = await transaction
      .select({ id: table.id, voidedAt: table.voidedAt })
      .from(table)
      .where(and(eq(table.id, movementId), eq(table.userId, userId)))
      .for("update");
    if (!movement) return { ok: false as const, error: "NOT_FOUND" as const };
    const voiding = action === "void";
    if ((voiding && movement.voidedAt) || (!voiding && !movement.voidedAt)) {
      return { ok: true as const, changed: false as const };
    }
    await transaction
      .update(table)
      .set({ voidedAt: voiding ? new Date() : null })
      .where(and(eq(table.id, movementId), eq(table.userId, userId)));
    await transaction.insert(schema.movementStatusEvent).values({
      id: crypto.randomUUID(),
      userId,
      movementType,
      movementId,
      action: voiding ? "voided" : "restored",
    });
    return { ok: true as const, changed: true as const };
  });
}

export async function getMovementStatusHistory<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  movementType: MovementType,
  movementId: string,
) {
  return db
    .select({ action: schema.movementStatusEvent.action, createdAt: schema.movementStatusEvent.createdAt })
    .from(schema.movementStatusEvent)
    .where(and(eq(schema.movementStatusEvent.userId, userId), eq(schema.movementStatusEvent.movementType, movementType), eq(schema.movementStatusEvent.movementId, movementId)))
    .orderBy(asc(schema.movementStatusEvent.createdAt));
}

export async function listVoidedMovements<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
) {
  const [expenses, transfers, conversions] = await Promise.all([
    db.select({ id: schema.expense.id, title: schema.expense.title, operationDate: schema.expense.operationDate }).from(schema.expense).where(and(eq(schema.expense.userId, userId), isNotNull(schema.expense.voidedAt))),
    db.select({ id: schema.ownTransfer.id, title: schema.ownTransfer.title, operationDate: schema.ownTransfer.operationDate }).from(schema.ownTransfer).where(and(eq(schema.ownTransfer.userId, userId), isNotNull(schema.ownTransfer.voidedAt))),
    db.select({ id: schema.currencyConversion.id, title: schema.currencyConversion.title, operationDate: schema.currencyConversion.operationDate }).from(schema.currencyConversion).where(and(eq(schema.currencyConversion.userId, userId), isNotNull(schema.currencyConversion.voidedAt))),
  ]);
  return [
    ...expenses.map((movement) => ({ ...movement, type: "expense" as const })),
    ...transfers.map((movement) => ({ ...movement, type: "transfer" as const })),
    ...conversions.map((movement) => ({ ...movement, type: "conversion" as const })),
  ].sort((left, right) => right.operationDate.localeCompare(left.operationDate));
}
