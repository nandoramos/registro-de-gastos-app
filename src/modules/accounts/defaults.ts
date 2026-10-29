import type { AccountView, AccountCurrency } from "@/modules/accounts/domain";

export function preferredAccountId(
  accounts: AccountView[],
  name: string,
  currency: AccountCurrency,
): string {
  return accounts.find(
    (account) =>
      account.name === name &&
      account.currency === currency &&
      account.archivedAt == null,
  )?.id ?? "";
}
