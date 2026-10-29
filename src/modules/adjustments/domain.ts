import { normalizeMoneyAmount, parseBalanceCents, formatScaledInteger } from "@/modules/money/decimal";
import { validOperationDate } from "@/modules/expenses/domain";

export type AdjustmentInput = {
  accountId: string;
  operationDate: string;
  direction: "increase" | "decrease";
  amount: string;
  title: string;
  note: string | null;
};

export function observedDifference(current: string, observed: string) {
  try {
    const difference = parseBalanceCents(observed) - parseBalanceCents(current);
    return { cents: difference, direction: difference >= 0n ? "increase" as const : "decrease" as const, amount: formatScaledInteger(difference < 0n ? -difference : difference, 2) };
  } catch {
    return undefined;
  }
}

export function adaptCreateAdjustment(value: unknown) {
  if (typeof value !== "object" || value === null) return { ok: false as const, error: "INVALID_INPUT" as const };
  const input = value as Record<string, unknown>;
  if (typeof input.accountId !== "string" || !input.accountId.trim() || typeof input.observedBalance !== "string") return { ok: false as const, error: "INVALID_INPUT" as const };
  const observedBalance = input.observedBalance.trim().replaceAll(",", ".");
  if (!/^-?\d{1,16}(?:\.\d{1,2})?$/.test(observedBalance)) return { ok: false as const, error: "INVALID_INPUT" as const };
  let observedCents: bigint;
  try { observedCents = parseBalanceCents(observedBalance); } catch { return { ok: false as const, error: "INVALID_INPUT" as const }; }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 1000) return { ok: false as const, error: "INVALID_INPUT" as const };
  return { ok: true as const, value: { accountId: input.accountId.trim(), observedCents, note: note || null } };
}

export function adaptUpdateAdjustment(value: unknown) {
  if (typeof value !== "object" || value === null) return { ok: false as const, error: "INVALID_INPUT" as const };
  const input = value as Record<string, unknown>;
  const accountId = typeof input.accountId === "string" ? input.accountId.trim() : "";
  const operationDate = typeof input.operationDate === "string" ? input.operationDate : "";
  const direction = input.direction === "increase" || input.direction === "decrease" ? input.direction : undefined;
  const amount = normalizeMoneyAmount(input.amount);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (!accountId || typeof input.operationDate !== "string" || !direction || !amount || !title || title.length > 120 || note.length > 1000) return { ok: false as const, error: "INVALID_INPUT" as const };
  if (!validOperationDate(operationDate)) return { ok: false as const, error: "INVALID_DATE" as const };
  return { ok: true as const, value: { accountId, operationDate, direction, amount, title, note: note || null } satisfies AdjustmentInput };
}
