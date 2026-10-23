import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  registerManualExpense,
  type ExpensesDatabase,
} from "@/modules/expenses/service";
import { analyzePendingExpense } from "./domain";
import {
  completePendingEntry,
  createPendingEntry,
  updatePendingInterpretation,
} from "./service";

export async function ingestManualCandidate<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  original: Record<string, unknown>,
) {
  const analysis = analyzePendingExpense(original);
  if (!analysis.complete) {
    return {
      kind: "pending" as const,
      entry: await createPendingEntry(
        db,
        userId,
        original,
        analysis.interpretation,
        analysis.issues,
      ),
    };
  }
  const registered = await registerManualExpense(
    db,
    userId,
    analysis.expense,
    original,
  );
  if (registered.ok) {
    return { kind: "registered" as const, expense: registered.expense };
  }
  return {
    kind: "pending" as const,
    entry: await createPendingEntry(
      db,
      userId,
      original,
      analysis.interpretation,
      [registered.error],
    ),
  };
}

export async function reviewPendingCandidate<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  correction: Record<string, unknown>,
) {
  const analysis = analyzePendingExpense(correction);
  if (!analysis.complete) {
    const entry = await updatePendingInterpretation(
      db,
      userId,
      id,
      analysis.interpretation,
      analysis.issues,
    );
    return entry
      ? { kind: "pending" as const, entry }
      : { kind: "not-found" as const };
  }
  const completed = await completePendingEntry(
    db,
    userId,
    id,
    analysis.expense,
    analysis.interpretation,
  );
  if (completed.ok) return { kind: "registered" as const, ...completed };
  if (completed.error === "NOT_FOUND") return { kind: "not-found" as const };
  const entry = await updatePendingInterpretation(
    db,
    userId,
    id,
    analysis.interpretation,
    [completed.error],
  );
  return entry
    ? { kind: "pending" as const, entry }
    : { kind: "not-found" as const };
}
