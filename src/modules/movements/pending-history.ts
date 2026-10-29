import type { AccountCurrency } from "@/modules/accounts/domain";
import type { PendingEntryView } from "@/modules/pending-entries/service";
import type { HistoryFilters, MovementType } from "./history";

export type PendingHistoryFilters = Pick<HistoryFilters, "month" | "startDate" | "endDate" | "accountIds" | "categoryIds" | "types" | "currencies" | "status" | "search" | "includeHouse"> & {
  houseMode: boolean;
  houseCategoryId?: string;
};

function pendingMovementType(entry: PendingEntryView): MovementType {
  if (entry.interpretation.entryType === "income") return "income";
  if (entry.interpretation.entryType === "own-transfer") return entry.interpretation.kind === "withdrawal" ? "withdrawal" : "transfer";
  if (entry.interpretation.entryType === "conversion") return "conversion";
  return "expense";
}

export function filterPendingHistory(entries: PendingEntryView[], filters: PendingHistoryFilters): PendingEntryView[] {
  const selectedTypes = new Set(filters.types ?? []);
  const selectedAccounts = new Set(filters.accountIds ?? []);
  const selectedCategories = new Set(filters.categoryIds ?? []);
  const selectedCurrencies = new Set(filters.currencies ?? []);
  const search = filters.search?.trim().toLocaleLowerCase("es-UY");
  if (filters.status === "voided") return [];
  return entries.filter((entry) => {
    const interpretation = entry.interpretation;
    const categoryId = typeof interpretation.categoryId === "string" ? interpretation.categoryId : "";
    const isHouse = Boolean(filters.houseCategoryId && categoryId === filters.houseCategoryId);
    if (filters.houseMode ? !isHouse : isHouse && !filters.includeHouse && !selectedCategories.has(categoryId)) return false;
    if (selectedTypes.size && !selectedTypes.has(pendingMovementType(entry))) return false;
    if (selectedCategories.size && categoryId && !selectedCategories.has(categoryId)) return false;
    const entryAccountIds = [interpretation.accountId, interpretation.sourceAccountId, interpretation.destinationAccountId].filter((value): value is string => typeof value === "string" && value.length > 0);
    if (selectedAccounts.size && !entryAccountIds.some((accountId) => selectedAccounts.has(accountId))) return false;
    if (selectedCurrencies.size) {
      const currencies = [interpretation.currency, interpretation.sourceCurrency, interpretation.destinationCurrency].filter((value): value is AccountCurrency => value === "UYU" || value === "USD");
      if (currencies.length && !currencies.some((currency) => selectedCurrencies.has(currency))) return false;
    }
    const date = typeof interpretation.operationDate === "string" ? interpretation.operationDate : "";
    const hasRange = Boolean(filters.startDate || filters.endDate);
    const startDate = hasRange ? filters.startDate : filters.month ? `${filters.month}-01` : undefined;
    const endDate = hasRange ? filters.endDate : filters.month ? `${filters.month}-31` : undefined;
    if (date && startDate && date < startDate) return false;
    if (date && endDate && date > endDate) return false;
    return !search || `${String(interpretation.title ?? "")} ${String(interpretation.note ?? "")}`.toLocaleLowerCase("es-UY").includes(search);
  });
}
