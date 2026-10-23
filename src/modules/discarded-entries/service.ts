import { and, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import {
  getPendingEntry,
  type PendingEntryView,
} from "@/modules/pending-entries/service";

export type DiscardedEntryView = Omit<PendingEntryView, "status"> & {
  status: "discarded";
  discardedAt: Date;
};

const selection = {
  id: schema.sourceEvent.id,
  sourceType: schema.sourceEvent.sourceType,
  receivedAt: schema.sourceEvent.receivedAt,
  original: schema.sourceEvent.originalPayload,
  reviewedAt: schema.pendingEntry.reviewedAt,
  discardedAt: schema.pendingEntry.discardedAt,
  interpretation: schema.pendingEntry.interpretation,
  issues: schema.pendingEntry.issues,
};

export async function getDiscardedEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
): Promise<DiscardedEntryView | undefined> {
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
        eq(schema.pendingEntry.status, "discarded"),
        eq(schema.sourceEvent.userId, userId),
      ),
    );
  if (!row || !row.discardedAt) return undefined;
  return { ...row, status: "discarded", discardedAt: row.discardedAt };
}

export async function listDiscardedEntries<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
): Promise<DiscardedEntryView[]> {
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
        eq(schema.pendingEntry.status, "discarded"),
        eq(schema.sourceEvent.userId, userId),
      ),
    )
    .orderBy(desc(schema.pendingEntry.discardedAt));
  return rows.flatMap((row) =>
    row.discardedAt
      ? [{ ...row, status: "discarded" as const, discardedAt: row.discardedAt }]
      : [],
  );
}

export async function discardPendingEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
): Promise<DiscardedEntryView | undefined> {
  const discardedAt = new Date();
  const changed = await db.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(schema.pendingEntry)
      .set({
        status: "discarded",
        discardedAt,
        reviewedAt: discardedAt,
        updatedAt: discardedAt,
      })
      .where(
        and(
          eq(schema.pendingEntry.sourceEventId, id),
          eq(schema.pendingEntry.userId, userId),
          eq(schema.pendingEntry.status, "pending"),
        ),
      )
      .returning({
        interpretation: schema.pendingEntry.interpretation,
        issues: schema.pendingEntry.issues,
      });
    if (!updated) return false;
    await transaction.insert(schema.sourceEventReview).values({
      id: crypto.randomUUID(),
      sourceEventId: id,
      userId,
      interpretation: updated.interpretation,
      issues: updated.issues,
      outcome: "discarded",
      createdAt: discardedAt,
    });
    return true;
  });
  if (!changed) return undefined;
  return getDiscardedEntry(db, userId, id);
}

export async function recoverDiscardedEntry<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
): Promise<PendingEntryView | undefined> {
  const reviewedAt = new Date();
  const changed = await db.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(schema.pendingEntry)
      .set({
        status: "pending",
        discardedAt: null,
        reviewedAt,
        updatedAt: reviewedAt,
      })
      .where(
        and(
          eq(schema.pendingEntry.sourceEventId, id),
          eq(schema.pendingEntry.userId, userId),
          eq(schema.pendingEntry.status, "discarded"),
        ),
      )
      .returning({
        interpretation: schema.pendingEntry.interpretation,
        issues: schema.pendingEntry.issues,
      });
    if (!updated) return false;
    await transaction.insert(schema.sourceEventReview).values({
      id: crypto.randomUUID(),
      sourceEventId: id,
      userId,
      interpretation: updated.interpretation,
      issues: updated.issues,
      outcome: "recovered",
      createdAt: reviewedAt,
    });
    return true;
  });
  if (!changed) return undefined;
  return getPendingEntry(db, userId, id);
}
