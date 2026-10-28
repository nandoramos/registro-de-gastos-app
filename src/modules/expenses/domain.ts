import {
  accountCurrencies,
  type AccountCurrency,
} from "@/modules/accounts/domain";

export type ExpenseInput = {
  operationDate: string;
  operationTime: string | null;
  title: string;
  note: string | null;
  categoryId: string;
  accountId: string;
  amount: string;
  currency: AccountCurrency;
};

export type ExpenseRevision = {
  id: string;
  previous: ExpenseInput;
  current: ExpenseInput;
  changedAt: Date;
};

export type ExpenseDetail = Omit<ExpenseInput, "accountId" | "categoryId"> & {
  id: string;
  voidedAt: Date | null;
  account: { id: string; name: string; currency: AccountCurrency };
  category: { id: string; name: string };
  source: {
    type: "manual" | "email";
    receivedAt: Date;
    original: Record<string, unknown>;
  };
  history: ExpenseRevision[];
};

export type ExpenseValidationError =
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "INVALID_TITLE"
  | "INVALID_NOTE"
  | "INVALID_ACCOUNT"
  | "INVALID_CATEGORY"
  | "INVALID_AMOUNT"
  | "INVALID_CURRENCY";

type ValidationResult =
  | {
      ok: true;
      value: {
        expense: ExpenseInput;
        original: Record<string, unknown>;
      };
    }
  | { ok: false; error: ExpenseValidationError };

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
}

export function validOperationDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value && value <= today
  );
}

export function normalizeMoneyAmount(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    return undefined;
  }
  const [rawWhole, rawFraction = ""] = value.split(/[.,]/);
  const whole = rawWhole.replace(/^0+(?=\d)/, "");
  const fraction = rawFraction.padEnd(2, "0");
  if (whole.length > 16 || (/^0+$/.test(whole) && /^0*$/.test(fraction))) {
    return undefined;
  }
  return `${whole}.${fraction}`;
}

export function adaptManualExpense(input: unknown): ValidationResult {
  const value = asRecord(input);
  const original: Record<string, unknown> = {
    operationDate: value.operationDate,
    ...(value.operationTime !== undefined
      ? { operationTime: value.operationTime }
      : {}),
    title: value.title,
    ...(value.note !== undefined ? { note: value.note } : {}),
    categoryId: value.categoryId,
    accountId: value.accountId,
    amount: value.amount,
    currency: value.currency,
  };

  if (!validOperationDate(value.operationDate)) {
    return { ok: false, error: "INVALID_DATE" };
  }
  const operationTime =
    value.operationTime === undefined ||
    value.operationTime === null ||
    value.operationTime === ""
      ? null
      : value.operationTime;
  if (
    operationTime !== null &&
    (typeof operationTime !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(operationTime))
  ) {
    return { ok: false, error: "INVALID_TIME" };
  }
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (title.length === 0 || title.length > 120) {
    return { ok: false, error: "INVALID_TITLE" };
  }
  const note =
    value.note === undefined || value.note === "" ? null : value.note;
  if (note !== null && (typeof note !== "string" || note.length > 1000)) {
    return { ok: false, error: "INVALID_NOTE" };
  }
  if (typeof value.accountId !== "string" || value.accountId.length === 0) {
    return { ok: false, error: "INVALID_ACCOUNT" };
  }
  if (typeof value.categoryId !== "string" || value.categoryId.length === 0) {
    return { ok: false, error: "INVALID_CATEGORY" };
  }
  const amount = normalizeMoneyAmount(value.amount);
  if (!amount) return { ok: false, error: "INVALID_AMOUNT" };
  if (!accountCurrencies.includes(value.currency as AccountCurrency)) {
    return { ok: false, error: "INVALID_CURRENCY" };
  }

  return {
    ok: true,
    value: {
      expense: {
        operationDate: value.operationDate,
        operationTime,
        title,
        note: note as string | null,
        categoryId: value.categoryId,
        accountId: value.accountId,
        amount,
        currency: value.currency as AccountCurrency,
      },
      original,
    },
  };
}
