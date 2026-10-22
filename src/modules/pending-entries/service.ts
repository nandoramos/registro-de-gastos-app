import { and, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpenseInput } from "@/modules/expenses/domain";
import {
  getExpenseDetail,
  type ExpensesDatabase,
} from "@/modules/expenses/service";

export type PendingEntryView = {
  id: string;
  status: "pending";
  sourceType: "manual";
  receivedAt: Date;
  reviewedAt: Date | null;
  interpretation: Record<string, unknown>;
  issues: string[];
  original: Record<string, unknown>;
};

function asPending(
  row: typeof schema.sourceEvent.$inferSelect,
): PendingEntryView {
  return {
    id: row.id,
    status: "pending",
    sourceType: row.sourceType,
    receivedAt: row.receivedAt,
    reviewedAt: row.reviewedAt,
    interpretation: row.interpretation,
    issues: row.issues,
    original: row.originalPayload,
  };
}

export async function createPendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  original: Record<string, unknown>,
  interpretation: Record<string, unknown>,
  issues: string[],
): Promise<PendingEntryView> {
  const [row] = await db
    .insert(schema.sourceEvent)
    .values({
      id: crypto.randomUUID(),
      userId,
      sourceType: "manual",
      status: "pending",
      originalPayload: original,
      interpretation,
      issues,
    })
    .returning();
  return asPending(row);
}

export async function listPendingEntries<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
): Promise<PendingEntryView[]> {
  const rows = await db
    .select()
    .from(schema.sourceEvent)
    .where(
      and(
        eq(schema.sourceEvent.userId, userId),
        eq(schema.sourceEvent.status, "pending"),
      ),
    )
    .orderBy(desc(schema.sourceEvent.receivedAt));
  return rows.map(asPending);
}

export async function getPendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
): Promise<PendingEntryView | undefined> {
  const [row] = await db
    .select()
    .from(schema.sourceEvent)
    .where(
      and(
        eq(schema.sourceEvent.id, id),
        eq(schema.sourceEvent.userId, userId),
        eq(schema.sourceEvent.status, "pending"),
      ),
    );
  return row ? asPending(row) : undefined;
}

export async function updatePendingInterpretation<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  interpretation: Record<string, unknown>,
  issues: string[],
): Promise<PendingEntryView | undefined> {
  const [row] = await db
    .update(schema.sourceEvent)
    .set({ interpretation, issues, reviewedAt: new Date() })
    .where(
      and(
        eq(schema.sourceEvent.id, id),
        eq(schema.sourceEvent.userId, userId),
        eq(schema.sourceEvent.status, "pending"),
      ),
    )
    .returning();
  return row ? asPending(row) : undefined;
}

type CompleteResult =
  | {
      ok: true;
      reviewedAt: Date;
      expense: NonNullable<Awaited<ReturnType<typeof getExpenseDetail>>>;
    }
  | {
      ok: false;
      error:
        | "NOT_FOUND"
        | "ACCOUNT_NOT_FOUND"
        | "CATEGORY_NOT_FOUND"
        | "CURRENCY_MISMATCH";
    };

export async function completePendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  input: ExpenseInput,
  interpretation: Record<string, unknown>,
): Promise<CompleteResult> {
  const pending = await getPendingEntry(db, userId, id);
  if (!pending) return { ok: false, error: "NOT_FOUND" };
  const [account] = await db
    .select({ currency: schema.financialAccount.currency })
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
  if (!category) return { ok: false, error: "CATEGORY_NOT_FOUND" };

  const expenseId = crypto.randomUUID();
  const reviewedAt = new Date();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.expense).values({
      id: expenseId,
      userId,
      sourceEventId: id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      operationDate: input.operationDate,
      operationTime: input.operationTime,
      title: input.title,
      note: input.note,
      amount: input.amount,
      currency: input.currency,
    });
    await transaction
      .update(schema.sourceEvent)
      .set({
        status: "registered",
        interpretation,
        issues: [],
        reviewedAt,
      })
      .where(
        and(
          eq(schema.sourceEvent.id, id),
          eq(schema.sourceEvent.userId, userId),
          eq(schema.sourceEvent.status, "pending"),
        ),
      );
  });
  const expense = await getExpenseDetail(db, userId, expenseId);
  if (!expense) throw new Error("Completed expense is unavailable");
  return { ok: true, reviewedAt, expense };
}
