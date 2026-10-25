export const accountKinds = ["bank", "cash"] as const;
export const accountCurrencies = ["UYU", "USD"] as const;

export type AccountKind = (typeof accountKinds)[number];
export type AccountCurrency = (typeof accountCurrencies)[number];

export type AccountView = {
  id: string;
  name: string;
  kind: AccountKind;
  currency: AccountCurrency;
  archivedAt?: Date | null;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "INVALID_NAME" | "INVALID_KIND" | "INVALID_CURRENCY" };

export function validateAccountCreation(input: unknown): ValidationResult<{
  name: string;
  kind: AccountKind;
  currency: AccountCurrency;
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
  return {
    ok: true,
    value: {
      name,
      kind: value.kind as AccountKind,
      currency: value.currency as AccountCurrency,
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
