import type { AccountCurrency, AccountView } from "@/modules/accounts/domain";

export type AccountSuggestion =
  | { status: "assigned"; account: AccountView }
  | {
      status: "manual";
      reason: "MISSING_CURRENCY" | "NO_CANDIDATE" | "MULTIPLE_CANDIDATES";
    };

export function suggestAccountFromCurrency(
  accounts: AccountView[],
  currency: AccountCurrency | undefined,
): AccountSuggestion {
  if (!currency) return { status: "manual", reason: "MISSING_CURRENCY" };
  const candidates = accounts.filter(
    (account) => account.currency === currency,
  );
  if (candidates.length === 0) {
    return { status: "manual", reason: "NO_CANDIDATE" };
  }
  if (candidates.length > 1) {
    return { status: "manual", reason: "MULTIPLE_CANDIDATES" };
  }
  return { status: "assigned", account: candidates[0] };
}
