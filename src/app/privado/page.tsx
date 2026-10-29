import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { countPendingEntries } from "@/modules/pending-entries/service";
import { HomeOverview } from "@/components/home-overview";
import { monthlySummary } from "@/modules/summary/service";
import { completeHomeExpenseTotals, greetingForHour, montevideoHour, montevideoMonth } from "@/modules/summary/home";
export const dynamic = "force-dynamic";
export default async function PrivateHome() {
  const access = await requireAuthorizedPage();
  const now = new Date();
  const month = montevideoMonth(now);
  const db = getAuthRuntime().db;
  const [summary, pendingCount] = await Promise.all([
    monthlySummary(db, access.userId, month),
    countPendingEntries(db, access.userId),
  ]);
  return <HomeOverview
    greeting={greetingForHour(montevideoHour(now))}
    month={month}
    expenses={completeHomeExpenseTotals(summary.totals)}
    pendingCount={pendingCount}
  />;
}
