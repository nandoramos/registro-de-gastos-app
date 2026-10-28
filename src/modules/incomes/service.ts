import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import type { IncomeDetail, IncomeInput } from "./domain";

export type IncomesDatabase<T extends PgQueryResultHKT> = ExpensesDatabase<T>;

const detailSelection = {
  id: schema.income.id,
  voidedAt: schema.income.voidedAt,
  operationDate: schema.income.operationDate,
  operationTime: schema.income.operationTime,
  title: schema.income.title,
  note: schema.income.note,
  amount: schema.income.amount,
  currency: schema.income.currency,
  accountId: schema.financialAccount.id,
  accountName: schema.financialAccount.name,
  accountCurrency: schema.financialAccount.currency,
  sourceType: schema.sourceEvent.sourceType,
  receivedAt: schema.sourceEvent.receivedAt,
  originalPayload: schema.sourceEvent.originalPayload,
};

export async function getIncomeDetail<T extends PgQueryResultHKT>(
  db: IncomesDatabase<T>,
  userId: string,
  incomeId: string,
): Promise<IncomeDetail | undefined> {
  const [row] = await db
    .select(detailSelection)
    .from(schema.income)
    .innerJoin(schema.sourceEvent, eq(schema.sourceEvent.id, schema.income.sourceEventId))
    .innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.income.accountId))
    .where(and(
      eq(schema.income.id, incomeId),
      eq(schema.income.userId, userId),
      eq(schema.sourceEvent.userId, userId),
      eq(schema.financialAccount.userId, userId),
    ));
  if (!row) return undefined;
  return {
    id: row.id,
    voidedAt: row.voidedAt,
    operationDate: row.operationDate,
    operationTime: row.operationTime,
    title: row.title,
    note: row.note,
    amount: row.amount,
    currency: row.currency,
    accountId: row.accountId,
    account: { id: row.accountId, name: row.accountName, currency: row.accountCurrency },
    source: { type: "manual", receivedAt: row.receivedAt, original: row.originalPayload },
  };
}
async function validateIncomeAccount<T extends PgQueryResultHKT>(
  db: IncomesDatabase<T>,
  userId: string,
  input: IncomeInput,
  retainedAccountId?: string,
) {
  const [account] = await db.select({
    id: schema.financialAccount.id,
    currency: schema.financialAccount.currency,
    archivedAt: schema.financialAccount.archivedAt,
    openingBalance: schema.financialAccount.openingBalance,
    openingDate: schema.financialAccount.openingDate,
  }).from(schema.financialAccount).where(and(
    eq(schema.financialAccount.id, input.accountId),
    eq(schema.financialAccount.userId, userId),
  ));
  if (!account || (account.archivedAt && input.accountId !== retainedAccountId) || account.openingBalance == null || account.openingDate == null || input.operationDate < account.openingDate) {
    return { ok: false as const, error: "ACCOUNT_NOT_FOUND" as const };
  }
  if (account.currency !== input.currency) return { ok: false as const, error: "CURRENCY_MISMATCH" as const };
  return { ok: true as const };
}

export async function registerManualIncome<T extends PgQueryResultHKT>(
  db: IncomesDatabase<T>,
  userId: string,
  input: IncomeInput,
  original: Record<string, unknown>,
): Promise<{ ok: true; income: IncomeDetail } | { ok: false; error: "ACCOUNT_NOT_FOUND" | "CURRENCY_MISMATCH" }> {
  const account = await validateIncomeAccount(db, userId, input);
  if (!account.ok) return account;
  const sourceEventId = crypto.randomUUID();
  const incomeId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType: "manual",
      originalPayload: original,
    });
    await transaction.insert(schema.income).values({
      id: incomeId,
      userId,
      sourceEventId,
      accountId: input.accountId,
      operationDate: input.operationDate,
      operationTime: input.operationTime,
      title: input.title,
      note: input.note,
      amount: input.amount,
      currency: input.currency,
    });
  });
  const income = await getIncomeDetail(db, userId, incomeId);
  if (!income) throw new Error("Registered income is unavailable");
  return { ok: true, income };
}

function storedIncomeInput(input: IncomeInput): IncomeInput {
  return {
    ...input,
    operationTime: input.operationTime && /^\d{2}:\d{2}$/.test(input.operationTime)
      ? `${input.operationTime}:00`
      : input.operationTime,
  };
}

function sameIncomeInput(left: IncomeInput, right: IncomeInput) {
  return (Object.keys(right) as (keyof IncomeInput)[]).every((key) => left[key] === right[key]);
}

export async function updateIncome<T extends PgQueryResultHKT>(
  db: IncomesDatabase<T>,
  userId: string,
  incomeId: string,
  input: IncomeInput,
): Promise<{ ok: true; income: IncomeDetail } | { ok: false; error: "NOT_FOUND" | "MOVEMENT_VOIDED" | "ACCOUNT_NOT_FOUND" | "CURRENCY_MISMATCH" }> {
  const [ownedIncome] = await db.select({ accountId: schema.income.accountId }).from(schema.income).where(and(
    eq(schema.income.id, incomeId),
    eq(schema.income.userId, userId),
  ));
  if (!ownedIncome) return { ok: false, error: "NOT_FOUND" };
  const account = await validateIncomeAccount(db, userId, input, ownedIncome.accountId);
  if (!account.ok) return account;
  const currentInput = storedIncomeInput(input);
  const changed = await db.transaction(async (transaction) => {
    const [previous] = await transaction.select({
      operationDate: schema.income.operationDate,
      operationTime: schema.income.operationTime,
      title: schema.income.title,
      note: schema.income.note,
      accountId: schema.income.accountId,
      amount: schema.income.amount,
      currency: schema.income.currency,
      voidedAt: schema.income.voidedAt,
    }).from(schema.income).where(and(
      eq(schema.income.id, incomeId),
      eq(schema.income.userId, userId),
    )).for("update");
    if (!previous) return "missing" as const;
    if (previous.voidedAt) return "voided" as const;
    if (sameIncomeInput(previous, currentInput)) return "unchanged" as const;
    await transaction.update(schema.income).set({
      accountId: input.accountId,
      operationDate: input.operationDate,
      operationTime: input.operationTime,
      title: input.title,
      note: input.note,
      amount: input.amount,
      currency: input.currency,
      updatedAt: new Date(),
    }).where(and(eq(schema.income.id, incomeId), eq(schema.income.userId, userId)));
    return "updated" as const;
  });
  if (changed === "missing") return { ok: false, error: "NOT_FOUND" };
  if (changed === "voided") return { ok: false, error: "MOVEMENT_VOIDED" };
  const income = await getIncomeDetail(db, userId, incomeId);
  if (!income) throw new Error("Updated income is unavailable");
  return { ok: true, income };
}
