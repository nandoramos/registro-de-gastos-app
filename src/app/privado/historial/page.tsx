import Link from "next/link";
import { MovementFilters, type MovementFilterValues } from "@/components/movement-filters";
import { MovementTable } from "@/components/movement-table";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listAccounts } from "@/modules/accounts/service";
import { listCategories } from "@/modules/categories/service";
import { listMovementHistory, summarizeMovementHistory, type HistoryFilters, type MovementType } from "@/modules/movements/history";
import { listPendingEntries } from "@/modules/pending-entries/service";
import { filterPendingHistory } from "@/modules/movements/pending-history";

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
  const [accounts, categories, allPending] = await Promise.all([
    listAccounts(db, access.userId, true),
    listCategories(db, access.userId, true),
    listPendingEntries(db, access.userId),
  ]);
  const houseCategory = categories.find((category) => category.systemKey === "house_construction");
  const effectiveCategoryIds = categoryIds.length ? categoryIds : houseMode && houseCategory ? [houseCategory.id] : [];
  const filters: HistoryFilters = {
    month, startDate, endDate, accountIds, categoryIds: effectiveCategoryIds, types,
    currencies, status, search: one(raw.search), includeHouse,
  };
  const movements = await listMovementHistory(db, access.userId, filters);
  const summary = summarizeMovementHistory(movements);
  const pendingEntries = filterPendingHistory(allPending, { month, startDate, endDate, accountIds, categoryIds: effectiveCategoryIds, types, currencies, status, search: one(raw.search), includeHouse, houseMode, houseCategoryId: houseCategory?.id });
  const activeSummary = [
    startDate || endDate ? `${startDate ?? "Inicio"} – ${endDate ?? "Hoy"}` : month,
    accountIds.length ? `${accountIds.length} cuenta(s)` : "",
    effectiveCategoryIds.length ? `${effectiveCategoryIds.length} categoría(s)` : "",
    types.length ? `${types.length} tipo(s)` : "",
    currencies.length ? currencies.join(" / ") : "",
    status === "voided" ? "Anulados" : status === "all" ? "Todos los estados" : "",
    one(raw.search) ? `«${one(raw.search)}»` : "",
  ].filter((value): value is string => Boolean(value));
  return <main className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-10 sm:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7"><div><Link href="/privado" className="font-semibold">Registro de Gastos</Link><p className="mt-2 text-sm text-stone-500">{includeHouse ? "Esta actividad incluye los movimientos de Casa Nueva. Los pendientes no afectan saldos ni totales." : "Casa Nueva está excluida de los movimientos habituales. Los pendientes no afectan saldos ni totales."}</p></div></header>
    <section className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Actividad</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Movimientos</h1></div><p className="text-sm text-stone-500">{movements.length} {movements.length === 1 ? "movimiento" : "movimientos"}</p></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-500">{houseMode ? "Vista Casa Nueva · desde el inicio hasta hoy" : "Gastos de Casa Nueva excluidos de la vista habitual"}</p><Link href={houseMode ? "/privado/historial" : `/privado/historial?house=true&endDate=${today()}`} className="min-h-11 rounded-lg border border-emerald-700/30 px-4 py-3 text-sm font-semibold text-emerald-800">{houseMode ? "Volver a movimientos habituales" : "Ver gastos casa"}</Link></div>
      <MovementFilters accounts={accounts} categories={categories} values={{ ...filterValues, categoryIds: effectiveCategoryIds }} houseMode={houseMode} includeHouse={includeHouse} summary={activeSummary} />
      {(summary.expenses.length > 0 || summary.income.length > 0) && <section className="mt-6 flex flex-wrap gap-3" aria-label="Totales de movimientos"><h2 className="sr-only">Totales filtrados</h2>{summary.expenses.map((item) => <p key={`expense-${item.currency}`} className="rounded-xl border border-stone-300/15 px-4 py-3 text-sm"><span className="text-stone-500">Gastos {item.currency}</span><strong className="ml-3">{item.amount}</strong></p>)}{summary.income.map((item) => <p key={`income-${item.currency}`} className="rounded-xl border border-stone-300/15 px-4 py-3 text-sm"><span className="text-stone-500">Ingresos {item.currency}</span><strong className="ml-3">{item.amount}</strong></p>)}</section>}
      {pendingEntries.length > 0 && <section className="mt-8 rounded-2xl border border-amber-300/40 bg-amber-300/5 p-4 sm:p-6" aria-labelledby="pending-movements-heading">
        <div className="flex items-center justify-between gap-4"><h2 id="pending-movements-heading" className="text-lg font-semibold">Pendientes ({pendingEntries.length})</h2><p className="text-sm text-stone-500">No afectan saldos ni totales</p></div>
        <ul className="mt-4 divide-y divide-stone-200/10">{pendingEntries.map((entry) => {
          const type = entry.interpretation.entryType === "income" ? "Ingreso" : entry.interpretation.entryType === "own-transfer" ? "Transferencia / retiro" : entry.interpretation.entryType === "conversion" ? "Conversión" : "Gasto";
          const title = typeof entry.interpretation.title === "string" && entry.interpretation.title ? entry.interpretation.title : `${type} sin detalle`;
          const date = typeof entry.interpretation.operationDate === "string" ? entry.interpretation.operationDate : "Sin fecha";
          return <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-medium"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />{title}</p><p className="mt-1 text-xs text-stone-500">Pendiente · {type} · {date}</p></div><Link aria-label={`Editar ${title}`} href={`/privado/pendientes/${entry.id}`} className="shrink-0 rounded-lg border border-stone-300/20 px-3 py-2 text-sm">✎ Editar</Link></li>;
        })}</ul>
      </section>}
      {movements.length === 0 && pendingEntries.length === 0 ? <p className="mt-8 rounded-xl border border-stone-300/15 p-6 text-sm text-stone-500">No hay movimientos con estos filtros. <Link className="underline" href={houseMode ? "/privado/historial?house=true" : "/privado/historial"}>Limpiar filtros</Link></p> : movements.length > 0 ? <MovementTable movements={movements} accounts={accounts} categories={categories} /> : null}
    </section>
  </main>;
}
