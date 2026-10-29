import {
  accountCurrencies,
  type AccountCurrency,
} from "@/modules/accounts/domain";
import { validOperationDate } from "@/modules/expenses/domain";
import { normalizeMoneyAmount } from "@/modules/money/decimal";

export type IncomeInput = {
  operationDate: string;
  operationTime: string | null;
  title: string;
  note: string | null;
  accountId: string;
  amount: string;
  currency: AccountCurrency;
};

export type IncomeValidationError =
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "INVALID_TITLE"
  | "INVALID_NOTE"
  | "INVALID_ACCOUNT"
  | "INVALID_AMOUNT"
  | "INVALID_CURRENCY";

type IncomeValidationResult =
  | { ok: true; value: { income: IncomeInput; original: Record<string, unknown> } }
  | { ok: false; error: IncomeValidationError };

export type IncomeDetail = IncomeInput & {
  id: string;
  voidedAt: Date | null;
  account: { id: string; name: string; currency: AccountCurrency };
  source: { type: "manual"; receivedAt: Date; original: Record<string, unknown> };
};

export function wouldIncomeOverdraw(balance: string | null | undefined, amount: string, previousAmount = "0.00") {
  const next = normalizeMoneyAmount(amount);
  const previous = normalizeMoneyAmount(previousAmount);
  const current = balance == null ? undefined : signedMinorUnits(balance);
  if (next == null || previous == null || current == null) return false;
  return current - BigInt(previous.replace(".", "")) + BigInt(next.replace(".", "")) < 0n;
}

function signedMinorUnits(value: string) {
  const negative = value.startsWith("-");
  const normalized = normalizeMoneyAmount(negative ? value.slice(1) : value);
  if (!normalized) return undefined;
  const cents = BigInt(normalized.replace(".", ""));
  return negative ? -cents : cents;
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
}

export function adaptManualIncome(input: unknown): IncomeValidationResult {
  const value = asRecord(input);
  const original: Record<string, unknown> = {
    operationDate: value.operationDate,
    ...(value.operationTime !== undefined ? { operationTime: value.operationTime } : {}),
    title: value.title,
    ...(value.note !== undefined ? { note: value.note } : {}),
    accountId: value.accountId,
    amount: value.amount,
    currency: value.currency,
  };

  if (!validOperationDate(value.operationDate)) {
    return { ok: false, error: "INVALID_DATE" };
  }
  const operationTime = value.operationTime === undefined || value.operationTime === null || value.operationTime === ""
    ? null
    : value.operationTime;
  if (operationTime !== null && (typeof operationTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(operationTime))) {
    return { ok: false, error: "INVALID_TIME" };
  }
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title || title.length > 120) return { ok: false, error: "INVALID_TITLE" };
  const note = value.note === undefined || value.note === "" ? null : value.note;
  if (note !== null && (typeof note !== "string" || note.length > 1000)) {
    return { ok: false, error: "INVALID_NOTE" };
  }
  if (typeof value.accountId !== "string" || !value.accountId) {
    return { ok: false, error: "INVALID_ACCOUNT" };
  }
  const amount = normalizeMoneyAmount(value.amount);
  if (!amount) return { ok: false, error: "INVALID_AMOUNT" };
  if (!accountCurrencies.includes(value.currency as AccountCurrency)) {
    return { ok: false, error: "INVALID_CURRENCY" };
  }
  return {
    ok: true,
    value: {
      income: {
        operationDate: value.operationDate,
        operationTime: operationTime as string | null,
        title,
        note: note as string | null,
        accountId: value.accountId,
        amount,
        currency: value.currency as AccountCurrency,
      },
      original,
    },
  };
}
