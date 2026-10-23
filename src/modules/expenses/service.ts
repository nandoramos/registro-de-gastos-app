import { and, asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpenseDetail, ExpenseInput } from "./domain";

export type ExpensesDatabase<T extends PgQueryResultHKT> = PgDatabase<
  T,
  typeof schema
>;

const detailSelection = {
  id: schema.expense.id,
  operationDate: schema.expense.operationDate,
  operationTime: schema.expense.operationTime,
  title: schema.expense.title,
  note: schema.expense.note,
  amount: schema.expense.amount,
  currency: schema.expense.currency,
  accountId: schema.financialAccount.id,
  accountName: schema.financialAccount.name,
  accountCurrency: schema.financialAccount.currency,
  categoryId: schema.expenseCategory.id,
  categoryName: schema.expenseCategory.name,
  sourceType: schema.sourceEvent.sourceType,
  receivedAt: schema.sourceEvent.receivedAt,
  originalPayload: schema.sourceEvent.originalPayload,
};

export async function getExpenseDetail<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  expenseId: string,
): Promise<ExpenseDetail | undefined> {
  const [row] = await db
    .select(detailSelection)
    .from(schema.expense)
    .innerJoin(
      schema.sourceEvent,
      eq(schema.sourceEvent.id, schema.expense.sourceEventId),
    )
    .innerJoin(
      schema.financialAccount,
      eq(schema.financialAccount.id, schema.expense.accountId),
    )
    .innerJoin(
      schema.expenseCategory,
      eq(schema.expenseCategory.id, schema.expense.categoryId),
    )
    .where(
      and(
        eq(schema.expense.id, expenseId),
        eq(schema.expense.userId, userId),
        eq(schema.sourceEvent.userId, userId),
        eq(schema.financialAccount.userId, userId),
        eq(schema.expenseCategory.userId, userId),
      ),
    );
  if (!row) return undefined;
  const history = await db
    .select({
      id: schema.expenseRevision.id,
      previous: schema.expenseRevision.previous,
      current: schema.expenseRevision.current,
      changedAt: schema.expenseRevision.changedAt,
    })
    .from(schema.expenseRevision)
    .where(
      and(
        eq(schema.expenseRevision.expenseId, expenseId),
        eq(schema.expenseRevision.userId, userId),
      ),
    )
    .orderBy(asc(schema.expenseRevision.changedAt));
  return {
    id: row.id,
    operationDate: row.operationDate,
    operationTime: row.operationTime,
    title: row.title,
    note: row.note,
    amount: row.amount,
    currency: row.currency,
    account: {
      id: row.accountId,
      name: row.accountName,
      currency: row.accountCurrency,
    },
    category: { id: row.categoryId, name: row.categoryName },
    source: {
      type: row.sourceType,
      receivedAt: row.receivedAt,
      original: row.originalPayload,
    },
    history,
  };
}

type RegistrationResult =
  | { ok: true; expense: ExpenseDetail }
  | {
      ok: false;
      error: "ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND" | "CURRENCY_MISMATCH";
    };

export async function validateExpenseReferences<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: ExpenseInput,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND" | "CURRENCY_MISMATCH";
    }
> {
  const [account] = await db
    .select({
      id: schema.financialAccount.id,
      currency: schema.financialAccount.currency,
    })
    .from(schema.financialAccount)
    .where(
      and(
        eq(schema.financialAccount.id, input.accountId),
        eq(schema.financialAccount.userId, userId),
      ),
    );
  if (!account) return { ok: false, error: "ACCOUNT_NOT_FOUND" };
  if (account.currency !== input.currency) {
    return { ok: false, error: "CURRENCY_MISMATCH" };
  }
  const [category] = await db
    .select({ id: schema.expenseCategory.id })
    .from(schema.expenseCategory)
    .where(
      and(
        eq(schema.expenseCategory.id, input.categoryId),
        eq(schema.expenseCategory.userId, userId),
      ),
    );
  return category ? { ok: true } : { ok: false, error: "CATEGORY_NOT_FOUND" };
}

export async function registerManualExpense<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: ExpenseInput,
  original: Record<string, unknown>,
): Promise<RegistrationResult> {
  const references = await validateExpenseReferences(db, userId, input);
  if (!references.ok) return references;

  const sourceEventId = crypto.randomUUID();
  const expenseId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType: "manual",
      originalPayload: original,
    });
    await transaction.insert(schema.expense).values({
      id: expenseId,
      userId,
      sourceEventId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      operationDate: input.operationDate,
      operationTime: input.operationTime,
      title: input.title,
      note: input.note,
      amount: input.amount,
      currency: input.currency,
    });
  });
  const expense = await getExpenseDetail(db, userId, expenseId);
  if (!expense) throw new Error("Registered expense is unavailable");
  return { ok: true, expense };
}

type UpdateResult =
  | { ok: true; expense: ExpenseDetail }
  | {
      ok: false;
      error:
        | "NOT_FOUND"
        | "ACCOUNT_NOT_FOUND"
        | "CATEGORY_NOT_FOUND"
        | "CURRENCY_MISMATCH";
    };

const expenseSnapshotSelection = {
  operationDate: schema.expense.operationDate,
  operationTime: schema.expense.operationTime,
  title: schema.expense.title,
  note: schema.expense.note,
  categoryId: schema.expense.categoryId,
  accountId: schema.expense.accountId,
  amount: schema.expense.amount,
  currency: schema.expense.currency,
};

function storedExpenseInput(input: ExpenseInput): ExpenseInput {
  return {
    ...input,
    operationTime:
      input.operationTime && /^\d{2}:\d{2}$/.test(input.operationTime)
        ? `${input.operationTime}:00`
        : input.operationTime,
  };
}

function sameExpenseInput(left: ExpenseInput, right: ExpenseInput): boolean {
  return (Object.keys(left) as (keyof ExpenseInput)[]).every(
    (key) => left[key] === right[key],
  );
}

export async function updateExpense<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<UpdateResult> {
  const [ownedExpense] = await db
    .select({ id: schema.expense.id })
    .from(schema.expense)
    .where(
      and(eq(schema.expense.id, expenseId), eq(schema.expense.userId, userId)),
    );
  if (!ownedExpense) return { ok: false, error: "NOT_FOUND" };

  const references = await validateExpenseReferences(db, userId, input);
  if (!references.ok) return references;
  const currentInput = storedExpenseInput(input);

  const changed = await db.transaction(async (transaction) => {
    const [previous] = await transaction
      .select(expenseSnapshotSelection)
      .from(schema.expense)
      .where(
        and(
          eq(schema.expense.id, expenseId),
          eq(schema.expense.userId, userId),
        ),
      )
      .for("update");
    if (!previous) return false;
    if (sameExpenseInput(previous, currentInput)) return "unchanged" as const;

    const [current] = await transaction
      .update(schema.expense)
      .set({ ...currentInput, updatedAt: new Date() })
      .where(
        and(
          eq(schema.expense.id, expenseId),
          eq(schema.expense.userId, userId),
        ),
      )
      .returning(expenseSnapshotSelection);
    if (!current) return false;

    await transaction.insert(schema.expenseRevision).values({
      id: crypto.randomUUID(),
      expenseId,
      userId,
      previous,
      current,
    });
    return true;
  });
  if (!changed) return { ok: false, error: "NOT_FOUND" };

  const expense = await getExpenseDetail(db, userId, expenseId);
  if (!expense) throw new Error("Updated expense is unavailable");
  return { ok: true, expense };
}
