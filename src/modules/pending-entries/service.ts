import { and, count, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpenseInput } from "@/modules/expenses/domain";
import {
  getExpenseDetail,
  validateExpenseReferences,
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

const selection = {
  id: schema.sourceEvent.id,
  sourceType: schema.sourceEvent.sourceType,
  receivedAt: schema.sourceEvent.receivedAt,
  original: schema.sourceEvent.originalPayload,
  reviewedAt: schema.pendingEntry.reviewedAt,
  interpretation: schema.pendingEntry.interpretation,
  issues: schema.pendingEntry.issues,
};

function asPending(row: Omit<PendingEntryView, "status">): PendingEntryView {
  return { ...row, status: "pending" };
}

export async function createPendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  original: Record<string, unknown>,
  interpretation: Record<string, unknown>,
  issues: string[],
): Promise<PendingEntryView> {
  const sourceEventId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType: "manual",
      originalPayload: original,
    });
    await transaction.insert(schema.pendingEntry).values({
      sourceEventId,
      userId,
      interpretation,
      issues,
    });
  });
  const entry = await getPendingEntry(db, userId, sourceEventId);
  if (!entry) throw new Error("Created pending entry is unavailable");
  return entry;
}

export async function listPendingEntries<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
): Promise<PendingEntryView[]> {
  const rows = await db
    .select(selection)
    .from(schema.pendingEntry)
    .innerJoin(
      schema.sourceEvent,
      eq(schema.sourceEvent.id, schema.pendingEntry.sourceEventId),
    )
    .where(
      and(
        eq(schema.pendingEntry.userId, userId),
        eq(schema.pendingEntry.status, "pending"),
        eq(schema.sourceEvent.userId, userId),
      ),
    )
    .orderBy(desc(schema.sourceEvent.receivedAt));
  return rows.map(asPending);
}

export async function countPendingEntries<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.pendingEntry)
    .where(
      and(
        eq(schema.pendingEntry.userId, userId),
        eq(schema.pendingEntry.status, "pending"),
      ),
    );
  return row.value;
}

export async function getPendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
): Promise<PendingEntryView | undefined> {
  const [row] = await db
    .select(selection)
    .from(schema.pendingEntry)
    .innerJoin(
      schema.sourceEvent,
      eq(schema.sourceEvent.id, schema.pendingEntry.sourceEventId),
    )
    .where(
      and(
        eq(schema.pendingEntry.sourceEventId, id),
        eq(schema.pendingEntry.userId, userId),
        eq(schema.pendingEntry.status, "pending"),
        eq(schema.sourceEvent.userId, userId),
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
  const reviewedAt = new Date();
  const updated = await db.transaction(async (transaction) => {
    const [row] = await transaction
      .update(schema.pendingEntry)
      .set({ interpretation, issues, reviewedAt, updatedAt: reviewedAt })
      .where(
        and(
          eq(schema.pendingEntry.sourceEventId, id),
          eq(schema.pendingEntry.userId, userId),
          eq(schema.pendingEntry.status, "pending"),
        ),
      )
      .returning({ id: schema.pendingEntry.sourceEventId });
    if (!row) return false;
    await transaction.insert(schema.sourceEventReview).values({
      id: crypto.randomUUID(),
      sourceEventId: id,
      userId,
      interpretation,
      issues,
      outcome: "pending",
      createdAt: reviewedAt,
    });
    return true;
  });
  return updated ? getPendingEntry(db, userId, id) : undefined;
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
  if (!(await getPendingEntry(db, userId, id))) {
    return { ok: false, error: "NOT_FOUND" };
  }
  const references = await validateExpenseReferences(db, userId, input);
  if (!references.ok) return references;

  const expenseId = crypto.randomUUID();
  const reviewedAt = new Date();
  const completed = await db.transaction(async (transaction) => {
    const [claimed] = await transaction
      .delete(schema.pendingEntry)
      .where(
        and(
          eq(schema.pendingEntry.sourceEventId, id),
          eq(schema.pendingEntry.userId, userId),
          eq(schema.pendingEntry.status, "pending"),
        ),
      )
      .returning({ id: schema.pendingEntry.sourceEventId });
    if (!claimed) return false;
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
    await transaction.insert(schema.sourceEventReview).values({
      id: crypto.randomUUID(),
      sourceEventId: id,
      userId,
      interpretation,
      issues: [],
      outcome: "registered",
      createdAt: reviewedAt,
    });
    return true;
  });
  if (!completed) return { ok: false, error: "NOT_FOUND" };
  const expense = await getExpenseDetail(db, userId, expenseId);
  if (!expense) throw new Error("Completed expense is unavailable");
  return { ok: true, reviewedAt, expense };
}
