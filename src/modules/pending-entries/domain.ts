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

const issueLabels: Record<string, string> = {
  INVALID_DATE: "Falta una fecha válida.",
  INVALID_TIME: "La hora no es válida.",
  INVALID_TITLE: "Falta un título válido.",
  INVALID_NOTE: "La nota es demasiado extensa.",
  INVALID_AMOUNT: "Falta un importe positivo con hasta 2 decimales.",
  INVALID_ACCOUNT: "Falta la cuenta de origen.",
  INVALID_CATEGORY: "Falta la categoría.",
  INVALID_CURRENCY: "Falta una moneda válida.",
  ACCOUNT_NOT_FOUND: "La cuenta no está disponible, no tiene saldo inicial o la fecha es anterior a su fecha inicial. Configurá el saldo o corregí la cuenta o la fecha.",
  CATEGORY_NOT_FOUND: "La categoría elegida no está disponible.",
  CURRENCY_MISMATCH: "La moneda no coincide con la cuenta.",
  FINANCIAL_NATURE_REQUIRED:
    "Indicá si la transferencia es un gasto o un traslado propio.",
  UNSUPPORTED_FORMAT: "El texto no coincide con un formato cubierto.",
  CONTRADICTORY_FORMAT: "El texto contiene tipos de operación incompatibles.",
  CONTRADICTORY_FIELD: "Un campo aparece con valores distintos.",
};

export function pendingIssueLabel(issue: string): string {
  return issueLabels[issue] ?? issue;
}

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
