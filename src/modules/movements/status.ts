import { and, asc, eq, isNotNull, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { validOperationDate } from "@/modules/expenses/domain";

export type MovementType = "expense" | "income" | "transfer" | "conversion";
export type MovementAction = "void" | "restore";

const tables = {
  expense: schema.expense,
  income: schema.income,
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
    if (!voiding) {
      const rows = movementType === "expense"
        ? await transaction.select({ date: schema.expense.operationDate, source: schema.expense.accountId }).from(schema.expense).where(and(eq(schema.expense.id, movementId), eq(schema.expense.userId, userId)))
        : movementType === "income"
          ? await transaction.select({ date: schema.income.operationDate, source: schema.income.accountId }).from(schema.income).where(and(eq(schema.income.id, movementId), eq(schema.income.userId, userId)))
          : movementType === "transfer"
          ? await transaction.select({ date: schema.ownTransfer.operationDate, source: schema.ownTransfer.sourceAccountId, destination: schema.ownTransfer.destinationAccountId }).from(schema.ownTransfer).where(and(eq(schema.ownTransfer.id, movementId), eq(schema.ownTransfer.userId, userId)))
          : await transaction.select({ date: schema.currencyConversion.operationDate, source: schema.currencyConversion.sourceAccountId, destination: schema.currencyConversion.destinationAccountId }).from(schema.currencyConversion).where(and(eq(schema.currencyConversion.id, movementId), eq(schema.currencyConversion.userId, userId)));
      const current = rows[0];
      if (!validOperationDate(current.date)) return { ok: false as const, error: "INVALID_DATE" as const };
      const ids = [current.source, ...("destination" in current && typeof current.destination === "string" ? [current.destination] : [])];
      const accounts = await transaction.select({ openingBalance: schema.financialAccount.openingBalance, openingDate: schema.financialAccount.openingDate }).from(schema.financialAccount).where(and(eq(schema.financialAccount.userId, userId), inArray(schema.financialAccount.id, ids)));
      if (accounts.length !== ids.length || accounts.some((account) => account.openingBalance == null || account.openingDate == null || current.date < account.openingDate)) return { ok: false as const, error: "ACCOUNT_NOT_CONFIGURED" as const };
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
  const [expenses, incomes, transfers, conversions] = await Promise.all([
    db.select({ id: schema.expense.id, title: schema.expense.title, operationDate: schema.expense.operationDate }).from(schema.expense).where(and(eq(schema.expense.userId, userId), isNotNull(schema.expense.voidedAt))),
    db.select({ id: schema.income.id, title: schema.income.title, operationDate: schema.income.operationDate }).from(schema.income).where(and(eq(schema.income.userId, userId), isNotNull(schema.income.voidedAt))),
    db.select({ id: schema.ownTransfer.id, title: schema.ownTransfer.title, operationDate: schema.ownTransfer.operationDate, kind: schema.ownTransfer.kind }).from(schema.ownTransfer).where(and(eq(schema.ownTransfer.userId, userId), isNotNull(schema.ownTransfer.voidedAt))),
    db.select({ id: schema.currencyConversion.id, title: schema.currencyConversion.title, operationDate: schema.currencyConversion.operationDate }).from(schema.currencyConversion).where(and(eq(schema.currencyConversion.userId, userId), isNotNull(schema.currencyConversion.voidedAt))),
  ]);
  return [
    ...expenses.map((movement) => ({ ...movement, type: "expense" as const })),
    ...incomes.map((movement) => ({ ...movement, type: "income" as const })),
    ...transfers.map(({ kind, ...movement }) => ({ ...movement, type: kind })),
    ...conversions.map((movement) => ({ ...movement, type: "conversion" as const })),
  ].sort((left, right) => right.operationDate.localeCompare(left.operationDate));
}
