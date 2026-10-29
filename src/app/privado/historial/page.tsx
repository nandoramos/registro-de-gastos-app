import { HistoryContent } from "@/components/history-content";
import { type MovementFilterValues } from "@/components/movement-filters";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listAccounts } from "@/modules/accounts/service";
import { listMovementHistory, type HistoryFilters, type MovementType } from "@/modules/movements/history";
import { listPendingEntries } from "@/modules/pending-entries/service";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const values = (value: string | string[] | undefined) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const currentMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit" }).format(new Date());
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const movementTypes: MovementType[] = ["expense", "income", "transfer", "withdrawal", "conversion", "adjustment"];

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const access = await requireAuthorizedPage();
  const raw = await searchParams;
  const houseMode = one(raw.house) === "true";
  const spendingOnly = one(raw.spending) === "true";
  const includeHouse = houseMode || one(raw.includeHouse) === "true";
  const startDate = one(raw.startDate);
  const endDate = one(raw.endDate) ?? (houseMode ? today() : undefined);
  const month = one(raw.month) ?? (!houseMode && !startDate && !endDate ? currentMonth() : undefined);
  const categoryIds = values(raw.categoryId);
  const accountIds = values(raw.accountId);
  const types = values(raw.type).filter((type): type is MovementType => movementTypes.includes(type as MovementType));
  const currencies = values(raw.currency).filter((currency): currency is "UYU" | "USD" => currency === "UYU" || currency === "USD");
  const statusValue = one(raw.status);
  const status: MovementFilterValues["status"] = statusValue === "voided" || statusValue === "all" ? statusValue : "active";
  const filterValues: MovementFilterValues = { month, startDate, endDate, accountIds, categoryIds, types, currencies, status, search: one(raw.search) };
  const db = getAuthRuntime().db;
  const filters: HistoryFilters = {
    month,
    startDate,
    endDate,
    accountIds,
    categoryIds,
    types,
    currencies,
    status,
    search: one(raw.search),
    includeHouse,
    houseOnly: houseMode && !categoryIds.length,
    spendingOnly,
  };
  const [accounts, allPending, movements] = await Promise.all([
    listAccounts(db, access.userId, true),
    spendingOnly ? [] : listPendingEntries(db, access.userId),
    listMovementHistory(db, access.userId, filters),
  ]);
  return <HistoryContent key={access.userId} userId={access.userId} accounts={accounts} movements={movements} allPending={allPending} filterValues={filterValues} houseMode={houseMode} includeHouse={includeHouse} spendingOnly={spendingOnly} today={today()} />;
}
