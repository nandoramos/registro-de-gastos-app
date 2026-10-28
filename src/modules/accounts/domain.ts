export const accountKinds = ["bank", "cash"] as const;
export const accountCurrencies = ["UYU", "USD"] as const;

export type AccountKind = (typeof accountKinds)[number];
export type AccountCurrency = (typeof accountCurrencies)[number];

export function validateOpeningBalance(input: { amount: string; date: string }):
  | { ok: true; value: { amount: string; date: string } }
  | { ok: false; error: "INVALID_OPENING_BALANCE" | "INVALID_OPENING_DATE" } {
  const raw = input.amount.trim();
  const amount = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(raw) ? raw.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(raw) ? raw.replaceAll(",", "")
    : raw.replace(",", ".");
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(amount)) return { ok: false, error: "INVALID_OPENING_BALANCE" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "INVALID_OPENING_DATE" };
  const parsed = new Date(`${input.date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.date) return { ok: false, error: "INVALID_OPENING_DATE" };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (input.date > today) return { ok: false, error: "INVALID_OPENING_DATE" };
  const [whole, fraction = ""] = amount.split(".");
  return { ok: true, value: { amount: `${whole}.${fraction.padEnd(2, "0")}`, date: input.date } };
}

export type AccountView = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: AccountCurrency;
  archivedAt?: Date | null;
  openingBalance?: string | null;
  openingDate?: string | null;
  balance?: string | null;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "INVALID_NAME" | "INVALID_KIND" | "INVALID_CURRENCY" | "INVALID_OPENING_BALANCE" | "INVALID_OPENING_DATE" };

export function validateAccountCreation(input: unknown): ValidationResult<{
  name: string;
  kind: AccountKind;
  currency: AccountCurrency;
  openingBalance: string;
  openingDate: string;
}> {
  const value = typeof input === "object" && input !== null ? input : {};
  const name =
    "name" in value && typeof value.name === "string" ? value.name.trim() : "";
  if (name.length === 0 || name.length > 80)
    return { ok: false, error: "INVALID_NAME" };
  if (!("kind" in value) || !accountKinds.includes(value.kind as AccountKind)) {
    return { ok: false, error: "INVALID_KIND" };
  }
  if (
    !("currency" in value) ||
    !accountCurrencies.includes(value.currency as AccountCurrency)
  ) {
    return { ok: false, error: "INVALID_CURRENCY" };
  }
  if (!("openingBalance" in value) || !("openingDate" in value) || typeof value.openingBalance !== "string" || typeof value.openingDate !== "string") return { ok: false, error: "INVALID_OPENING_BALANCE" };
  const opening = validateOpeningBalance({ amount: value.openingBalance, date: value.openingDate });
  if (!opening.ok) return opening;
  return {
    ok: true,
    value: {
      name,
      kind: value.kind as AccountKind,
      currency: value.currency as AccountCurrency,
      openingBalance: opening.value.amount,
      openingDate: opening.value.date,
    },
  };
}

export function validateAccountRename(
  input: unknown,
): ValidationResult<{ name: string }> {
  const value = typeof input === "object" && input !== null ? input : {};
  const name =
    "name" in value && typeof value.name === "string" ? value.name.trim() : "";
  if (name.length === 0 || name.length > 80)
    return { ok: false, error: "INVALID_NAME" };
  return { ok: true, value: { name } };
}
