import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  registerManualExpense,
  type ExpensesDatabase,
} from "@/modules/expenses/service";
import { analyzePendingExpense } from "./domain";
import {
  completePendingConversion,
  completePendingTransfer,
  completePendingEntry,
  createPendingEntry,
  getPendingEntry,
  updatePendingInterpretation,
} from "./service";
import { analyzeConversion } from "@/modules/conversions/domain";
import { analyzeTransfer } from "@/modules/transfers/domain";
import { adaptManualIncome } from "@/modules/incomes/domain";
import { completePendingIncome } from "./service";
import { validOperationDate } from "@/modules/expenses/domain";
import { normalizeMoneyAmount } from "@/modules/money/decimal";

export async function createManualPendingCandidate<T extends PgQueryResultHKT>(db: ExpensesDatabase<T>, userId: string, entryType: string, initial: Record<string, unknown> = {}) {
  const original = { entryType, ...initial };
  if (entryType === "expense") {
    const analysis = analyzePendingExpense(initial);
    return createPendingEntry(db, userId, original, { ...analysis.interpretation, entryType }, analysis.complete ? [] : analysis.issues);
  }
  if (entryType === "income") {
    const issues = [
      !validOperationDate(initial.operationDate) ? "INVALID_DATE" : undefined,
      typeof initial.title !== "string" || !initial.title.trim() ? "INVALID_TITLE" : undefined,
      typeof initial.accountId !== "string" || !initial.accountId ? "INVALID_ACCOUNT" : undefined,
      !normalizeMoneyAmount(initial.amount) ? "INVALID_AMOUNT" : undefined,
      initial.currency !== "UYU" && initial.currency !== "USD" ? "INVALID_CURRENCY" : undefined,
    ].filter((issue): issue is string => Boolean(issue));
    return createPendingEntry(db, userId, original, { ...initial, entryType }, issues);
  }
  if (entryType === "own-transfer") {
    const analysis = analyzeTransfer({ ...initial, kind: initial.kind === "withdrawal" ? "withdrawal" : "transfer" });
    return createPendingEntry(db, userId, original, analysis.interpretation, analysis.complete ? [] : analysis.issues);
  }
  if (entryType === "conversion") {
    const analysis = analyzeConversion(initial);
    return createPendingEntry(db, userId, original, analysis.interpretation, analysis.complete ? [] : analysis.issues);
  }
  return undefined;
}

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

async function returnPendingCorrection<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>, userId: string, id: string,
  existing: NonNullable<Awaited<ReturnType<typeof getPendingEntry>>>,
  interpretation: Record<string, unknown>, issues: string[],
) {
  const isVersionTwoDraft = existing.sourceType === "manual" && typeof existing.original.entryType === "string";
  const entry = isVersionTwoDraft
    ? { ...existing, interpretation, issues }
    : await updatePendingInterpretation(db, userId, id, interpretation, issues);
  return entry ? { kind: "pending" as const, entry } : { kind: "not-found" as const };
}

export async function reviewPendingCandidate<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  id: string,
  correction: Record<string, unknown>,
) {
  const existing = await getPendingEntry(db, userId, id);
  if (!existing) return { kind: "not-found" as const };
  if (existing.interpretation.entryType === "income") {
    const analysis = adaptManualIncome(correction);
    const interpretation = { entryType: "income", ...correction };
    if (!analysis.ok) {
      return returnPendingCorrection(db, userId, id, existing, interpretation, [analysis.error]);
    }
    const completed = await completePendingIncome(db, userId, id, analysis.value.income, interpretation);
    if (completed.ok) return { kind: "registered-income" as const, ...completed };
    if (completed.error === "NOT_FOUND") return { kind: "not-found" as const };
    return returnPendingCorrection(db, userId, id, existing, interpretation, [completed.error]);
  }
  if (existing.interpretation.entryType === "email-transfer-choice") {
    if (correction.nature === "own-transfer") {
      const analysis = analyzeTransfer({
        entryType: "own-transfer",
        kind: "transfer",
        operationDate: existing.interpretation.operationDate,
        title: existing.interpretation.title,
        note: "",
        sourceAccountId: correction.accountId,
        destinationAccountId: "",
        sourceAmount: existing.interpretation.amount,
        destinationAmount: "",
        currency: existing.interpretation.currency,
      });
      const entry = await updatePendingInterpretation(
        db,
        userId,
        id,
        analysis.interpretation,
        analysis.complete ? [] : analysis.issues,
      );
      return entry
        ? { kind: "pending" as const, entry }
        : { kind: "not-found" as const };
    }
    if (correction.nature === "expense") {
      const analysis = analyzePendingExpense({
        operationDate: existing.interpretation.operationDate,
        operationTime: existing.interpretation.operationTime,
        title: existing.interpretation.title,
        note: "",
        amount: existing.interpretation.amount,
        currency: existing.interpretation.currency,
        accountId: correction.accountId,
        categoryId: correction.categoryId,
      });
      const entry = await updatePendingInterpretation(
        db,
        userId,
        id,
        analysis.interpretation,
        analysis.complete ? [] : analysis.issues,
      );
      return entry
        ? { kind: "pending" as const, entry }
        : { kind: "not-found" as const };
    }
    return { kind: "pending" as const, entry: existing };
  }
  if (existing.interpretation.entryType === "conversion") {
    const analysis = analyzeConversion(correction);
    if (!analysis.complete) {
      return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, analysis.issues);
    }
    const completed = await completePendingConversion(
      db,
      userId,
      id,
      analysis.conversion,
      analysis.interpretation,
    );
    if (completed.ok) {
      return { kind: "registered-conversion" as const, ...completed };
    }
    if (completed.error === "NOT_FOUND") {
      return { kind: "not-found" as const };
    }
    return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, [completed.error]);
  }
  if (existing.interpretation.entryType === "own-transfer") {
    const analysis = analyzeTransfer(correction);
    if (!analysis.complete) {
      return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, analysis.issues);
    }
    const completed = await completePendingTransfer(
      db,
      userId,
      id,
      analysis.transfer,
      analysis.interpretation,
    );
    if (completed.ok) {
      return { kind: "registered-transfer" as const, ...completed };
    }
    if (completed.error === "NOT_FOUND") {
      return { kind: "not-found" as const };
    }
    return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, [completed.error]);
  }
  const analysis = analyzePendingExpense(correction);
  if (!analysis.complete) {
    return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, analysis.issues);
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
  return returnPendingCorrection(db, userId, id, existing, analysis.interpretation, [completed.error]);
}
