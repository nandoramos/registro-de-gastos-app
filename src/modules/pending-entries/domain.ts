import {
  adaptManualExpense,
  type ExpenseInput,
  type ExpenseValidationError,
} from "@/modules/expenses/domain";

const fields = [
  "operationDate",
  "operationTime",
  "title",
  "note",
  "accountId",
  "categoryId",
  "amount",
  "currency",
] as const;

const validExample = {
  operationDate: "2026-01-01",
  operationTime: "",
  title: "Entrada",
  note: "",
  accountId: "account",
  categoryId: "category",
  amount: "1.00",
  currency: "UYU",
};

export type PendingAnalysis =
  | {
      complete: true;
      expense: ExpenseInput;
      interpretation: Record<string, unknown>;
    }
  | {
      complete: false;
      issues: ExpenseValidationError[];
      interpretation: Record<string, unknown>;
    };

export function recordFromUnknown(
  input: unknown,
): Record<string, unknown> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}

export function analyzePendingExpense(
  input: Record<string, unknown>,
): PendingAnalysis {
  const interpretation = Object.fromEntries(
    fields
      .filter((field) => input[field] !== undefined)
      .map((field) => [field, input[field]]),
  );
  const complete = adaptManualExpense(input);
  if (complete.ok) {
    return {
      complete: true,
      expense: complete.value.expense,
      interpretation,
    };
  }

  const issues = fields.flatMap((field) => {
    const candidate = adaptManualExpense({
      ...validExample,
      [field]: input[field],
    });
    return candidate.ok ? [] : [candidate.error];
  });
  return { complete: false, issues: [...new Set(issues)], interpretation };
}
