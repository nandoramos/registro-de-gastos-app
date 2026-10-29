import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { ensureInitialCategories } from "@/modules/categories/service";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { accountBalanceExpression } from "@/modules/accounts/service";
import { formatScaledInteger } from "@/modules/money/decimal";
import { observedDifference, type AdjustmentInput } from "./domain";

export type AdjustmentsDatabase<T extends PgQueryResultHKT> = ExpensesDatabase<T>;

async function detail<T extends PgQueryResultHKT>(db: AdjustmentsDatabase<T>, userId: string, id: string) {
  const [row] = await db.select({ id: schema.manualAdjustment.id, accountId: schema.manualAdjustment.accountId, account: schema.financialAccount.name, currency: schema.financialAccount.currency, category: schema.expenseCategory.name, operationDate: schema.manualAdjustment.operationDate, title: schema.manualAdjustment.title, note: schema.manualAdjustment.note, direction: schema.manualAdjustment.direction, amount: schema.manualAdjustment.amount, voidedAt: schema.manualAdjustment.voidedAt }).from(schema.manualAdjustment).innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.manualAdjustment.accountId)).leftJoin(schema.expenseCategory, eq(schema.expenseCategory.id, schema.manualAdjustment.categoryId)).where(and(eq(schema.manualAdjustment.id, id), eq(schema.manualAdjustment.userId, userId), eq(schema.financialAccount.userId, userId)));
  return row;
}

function todayInMontevideo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function getAdjustmentDetail<T extends PgQueryResultHKT>(db: AdjustmentsDatabase<T>, userId: string, id: string) {
  return detail(db, userId, id);
}

export async function registerManualAdjustment<T extends PgQueryResultHKT>(db: AdjustmentsDatabase<T>, userId: string, input: { accountId: string; observedCents: bigint; note: string | null }) {
  const operationDate = todayInMontevideo();
  await ensureInitialCategories(db, userId);
  const [category] = await db.select({ id: schema.expenseCategory.id }).from(schema.expenseCategory).where(and(eq(schema.expenseCategory.userId, userId), eq(schema.expenseCategory.systemKey, "manual_adjustment")));
  const adjustmentId = crypto.randomUUID();
  const sourceEventId = crypto.randomUUID();
  const outcome = await db.transaction(async (transaction) => {
    const [account] = await transaction.select({ id: schema.financialAccount.id, openingDate: schema.financialAccount.openingDate, openingBalance: schema.financialAccount.openingBalance, archivedAt: schema.financialAccount.archivedAt }).from(schema.financialAccount).where(and(eq(schema.financialAccount.id, input.accountId), eq(schema.financialAccount.userId, userId))).for("update");
    if (!account || account.archivedAt) return { ok: false as const, error: "ACCOUNT_NOT_FOUND" as const };
    if (account.openingBalance === null || account.openingDate === null) return { ok: false as const, error: "ACCOUNT_NOT_CONFIGURED" as const };
    if (operationDate < account.openingDate) return { ok: false as const, error: "INVALID_DATE" as const };
    const [current] = await transaction.select({ balance: accountBalanceExpression() }).from(schema.financialAccount).where(and(eq(schema.financialAccount.id, input.accountId), eq(schema.financialAccount.userId, userId)));
    if (!current?.balance) return { ok: false as const, error: "ACCOUNT_NOT_CONFIGURED" as const };
    const difference = observedDifference(current.balance, formatScaledInteger(input.observedCents, 2));
    if (!difference) return { ok: false as const, error: "INVALID_BALANCE" as const };
    if (difference.cents === 0n) return { ok: true as const, status: "already_equal" as const };
    if (difference.direction === "decrease" && !category) throw new Error("Manual adjustment category is unavailable");
    await transaction.insert(schema.sourceEvent).values({ id: sourceEventId, userId, sourceType: "manual", originalPayload: { kind: "manual_adjustment", observedBalance: formatScaledInteger(input.observedCents, 2) } });
    await transaction.insert(schema.manualAdjustment).values({ id: adjustmentId, userId, sourceEventId, accountId: input.accountId, categoryId: difference.direction === "decrease" ? category!.id : null, operationDate, title: "Ajuste manual", note: input.note, direction: difference.direction, amount: difference.amount });
    return { ok: true as const, status: "created" as const };
  });
  if (!outcome.ok) return outcome;
  if (outcome.status === "already_equal") return outcome;
  const adjustment = await detail(db, userId, adjustmentId);
  if (!adjustment) throw new Error("Registered adjustment is unavailable");
  return { ...outcome, adjustment };
}

async function validateAccount<T extends PgQueryResultHKT>(db: AdjustmentsDatabase<T>, userId: string, accountId: string, operationDate: string, retainedAccountId?: string) {
  const [account] = await db.select({ id: schema.financialAccount.id, openingDate: schema.financialAccount.openingDate, openingBalance: schema.financialAccount.openingBalance, archivedAt: schema.financialAccount.archivedAt }).from(schema.financialAccount).where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId)));
  if (!account || account.openingBalance === null || account.openingDate === null || (account.archivedAt && accountId !== retainedAccountId)) return false;
  return operationDate >= account.openingDate;
}

export async function updateManualAdjustment<T extends PgQueryResultHKT>(db: AdjustmentsDatabase<T>, userId: string, id: string, input: AdjustmentInput) {
  const [owned] = await db.select({ accountId: schema.manualAdjustment.accountId, voidedAt: schema.manualAdjustment.voidedAt }).from(schema.manualAdjustment).where(and(eq(schema.manualAdjustment.id, id), eq(schema.manualAdjustment.userId, userId)));
  if (!owned) return { ok: false as const, error: "NOT_FOUND" as const };
  if (owned.voidedAt) return { ok: false as const, error: "MOVEMENT_VOIDED" as const };
  if (!(await validateAccount(db, userId, input.accountId, input.operationDate, owned.accountId))) return { ok: false as const, error: "ACCOUNT_NOT_FOUND" as const };
  let categoryId: string | null = null;
  if (input.direction === "decrease") {
    await ensureInitialCategories(db, userId);
    const [category] = await db.select({ id: schema.expenseCategory.id }).from(schema.expenseCategory).where(and(eq(schema.expenseCategory.userId, userId), eq(schema.expenseCategory.systemKey, "manual_adjustment")));
    if (!category) throw new Error("Manual adjustment category is unavailable");
    categoryId = category.id;
  }
  await db.transaction(async (transaction) => {
    const [current] = await transaction.select({ id: schema.manualAdjustment.id, voidedAt: schema.manualAdjustment.voidedAt }).from(schema.manualAdjustment).where(and(eq(schema.manualAdjustment.id, id), eq(schema.manualAdjustment.userId, userId))).for("update");
    if (!current) return;
    if (current.voidedAt) throw new Error("MOVEMENT_VOIDED");
    await transaction.update(schema.manualAdjustment).set({ accountId: input.accountId, operationDate: input.operationDate, direction: input.direction, amount: input.amount, title: input.title, note: input.note, categoryId, updatedAt: new Date() }).where(and(eq(schema.manualAdjustment.id, id), eq(schema.manualAdjustment.userId, userId)));
  });
  const adjustment = await detail(db, userId, id);
  if (!adjustment) return { ok: false as const, error: "NOT_FOUND" as const };
  return { ok: true as const, adjustment };
}
