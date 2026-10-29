import { and, count, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ConversionInput } from "@/modules/conversions/domain";
import {
  getConversionDetail,
  validateConversionReferences,
} from "@/modules/conversions/service";
import type { ExpenseInput } from "@/modules/expenses/domain";
import {
  getExpenseDetail,
  validateExpenseReferences,
  type ExpensesDatabase,
} from "@/modules/expenses/service";
import type { TransferInput } from "@/modules/transfers/domain";
import {
  getTransferDetail,
  validateTransferReferences,
} from "@/modules/transfers/service";
import type { IncomeInput } from "@/modules/incomes/domain";
import { getIncomeDetail, validateIncomeReferences } from "@/modules/incomes/service";

export type PendingEntryView = {
  id: string;
  status: "pending";
  sourceType: "manual" | "email";
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
  sourceType: "manual" | "email" = "manual",
): Promise<PendingEntryView> {
  const sourceEventId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType,
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

async function completePendingMovement<
  T extends PgQueryResultHKT,
  Movement,
  ValidationError extends string,
>(
  db: ExpensesDatabase<T>,
  userId: string,
  sourceEventId: string,
  interpretation: Record<string, unknown>,
  validate: () => Promise<{ ok: true } | { ok: false; error: ValidationError }>,
  insertMovement: (
    transaction: ExpensesDatabase<T>,
    movementId: string,
  ) => Promise<void>,
  readMovement: (movementId: string) => Promise<Movement | undefined>,
  unavailableMessage: string,
): Promise<
  | { ok: true; reviewedAt: Date; movement: Movement }
  | { ok: false; error: "NOT_FOUND" | ValidationError }
> {
  if (!(await getPendingEntry(db, userId, sourceEventId))) {
    return { ok: false, error: "NOT_FOUND" };
  }
  const validation = await validate();
  if (!validation.ok) return validation;

  const movementId = crypto.randomUUID();
  const reviewedAt = new Date();
  const completed = await db.transaction(async (transaction) => {
    const [claimed] = await transaction
      .delete(schema.pendingEntry)
      .where(
        and(
          eq(schema.pendingEntry.sourceEventId, sourceEventId),
          eq(schema.pendingEntry.userId, userId),
          eq(schema.pendingEntry.status, "pending"),
        ),
      )
      .returning({ id: schema.pendingEntry.sourceEventId });
    if (!claimed) return false;
    await insertMovement(transaction, movementId);
    await transaction.insert(schema.sourceEventReview).values({
      id: crypto.randomUUID(),
      sourceEventId,
      userId,
      interpretation,
      issues: [],
      outcome: "registered",
      createdAt: reviewedAt,
    });
    return true;
  });
  if (!completed) return { ok: false, error: "NOT_FOUND" };
  const movement = await readMovement(movementId);
  if (!movement) throw new Error(unavailableMessage);
  return { ok: true, reviewedAt, movement };
}

export async function completePendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  input: ExpenseInput,
  interpretation: Record<string, unknown>,
): Promise<CompleteResult> {
  const completed = await completePendingMovement(
    db,
    userId,
    id,
    interpretation,
    () => validateExpenseReferences(db, userId, input),
    async (transaction, expenseId) => {
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
    },
    (expenseId) => getExpenseDetail(db, userId, expenseId),
    "Completed expense is unavailable",
  );
  return completed.ok
    ? {
        ok: true,
        reviewedAt: completed.reviewedAt,
        expense: completed.movement,
      }
    : completed;
}

export async function completePendingIncome<T extends PgQueryResultHKT>(db: ExpensesDatabase<T>, userId: string, id: string, input: IncomeInput, interpretation: Record<string, unknown>) {
  const completed = await completePendingMovement(
    db, userId, id, interpretation,
    () => validateIncomeReferences(db, userId, input),
    async (transaction, incomeId) => { await transaction.insert(schema.income).values({ id: incomeId, userId, sourceEventId: id, ...input }); },
    (incomeId) => getIncomeDetail(db, userId, incomeId),
    "Completed income is unavailable",
  );
  return completed.ok ? { ok: true as const, reviewedAt: completed.reviewedAt, income: completed.movement } : completed;
}

export async function deleteManualPendingEntry<T extends PgQueryResultHKT>(db: ExpensesDatabase<T>, userId: string, id: string): Promise<boolean> {
  const entry = await getPendingEntry(db, userId, id);
  if (!entry || entry.sourceType !== "manual") return false;
  const [deleted] = await db.delete(schema.sourceEvent).where(and(
    eq(schema.sourceEvent.id, id), eq(schema.sourceEvent.userId, userId), eq(schema.sourceEvent.sourceType, "manual"),
  )).returning({ id: schema.sourceEvent.id });
  return Boolean(deleted);
}

export async function completePendingTransfer<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  input: TransferInput,
  interpretation: Record<string, unknown>,
) {
  const completed = await completePendingMovement(
    db,
    userId,
    id,
    interpretation,
    () => validateTransferReferences(db, userId, input),
    async (transaction, transferId) => {
      await transaction.insert(schema.ownTransfer).values({
        id: transferId,
        userId,
        sourceEventId: id,
        ...input,
      });
    },
    (transferId) => getTransferDetail(db, userId, transferId),
    "Completed transfer is unavailable",
  );
  return completed.ok
    ? {
        ok: true as const,
        reviewedAt: completed.reviewedAt,
        transfer: completed.movement,
      }
    : completed;
}

export async function completePendingConversion<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  input: ConversionInput,
  interpretation: Record<string, unknown>,
) {
  const completed = await completePendingMovement(
    db,
    userId,
    id,
    interpretation,
    () => validateConversionReferences(db, userId, input),
    async (transaction, conversionId) => {
      await transaction.insert(schema.currencyConversion).values({
        id: conversionId,
        userId,
        sourceEventId: id,
        ...input,
      });
    },
    (conversionId) => getConversionDetail(db, userId, conversionId),
    "Completed conversion is unavailable",
  );
  return completed.ok
    ? {
        ok: true as const,
        reviewedAt: completed.reviewedAt,
        conversion: completed.movement,
      }
    : completed;
}
