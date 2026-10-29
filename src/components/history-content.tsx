"use client";

import Link from "next/link";
import { MovementFilters, type MovementFilterValues } from "@/components/movement-filters";
import { MovementTable } from "@/components/movement-table";
import { CategoryNotice } from "@/components/category-notice";
import { useCategories } from "@/components/category-cache";
import { formatMoneyAmount } from "@/modules/money/format";
import { summarizeMovementHistory } from "@/modules/movements/summary";
import { filterPendingHistory } from "@/modules/movements/pending-history";
import type { MovementHistoryItem } from "@/modules/movements/history";
import type { PendingEntryView } from "@/modules/pending-entries/service";
import type { AccountView } from "@/modules/accounts/domain";

export function HistoryContent({ userId, accounts, movements, allPending, filterValues, houseMode, includeHouse, spendingOnly, today }: {
  userId: string; accounts: AccountView[]; movements: MovementHistoryItem[]; allPending: PendingEntryView[];
  filterValues: MovementFilterValues; houseMode: boolean; includeHouse: boolean; spendingOnly: boolean; today: string;
}) {
  const state = useCategories(userId);
  const categories = state.categories ?? [];
  const { month, startDate, endDate, accountIds, categoryIds, types, currencies, status, search } = filterValues;
  const houseCategory = categories.find((category) => category.systemKey === "house_construction");
  const effectiveCategoryIds = categoryIds.length ? categoryIds : houseMode && houseCategory ? [houseCategory.id] : [];
  const summary = summarizeMovementHistory(movements);
  const pendingEntries = !state.categories || spendingOnly ? [] : filterPendingHistory(allPending, { month, startDate, endDate, accountIds, categoryIds: effectiveCategoryIds, types, currencies, status, search: search, includeHouse, houseMode, houseCategoryId: houseCategory?.id });
  const activeSummary = [
    startDate || endDate ? `${startDate ?? "Inicio"} – ${endDate ?? "Hoy"}` : month,
    accountIds.length ? `${accountIds.length} cuenta(s)` : "",
    effectiveCategoryIds.length ? `${effectiveCategoryIds.length} categoría(s)` : "",
    types.length ? `${types.length} tipo(s)` : "",
    currencies.length ? currencies.join(" / ") : "",
    status === "voided" ? "Anulados" : status === "all" ? "Todos los estados" : "",
    search ? `«${search}»` : "",
  ].filter((value): value is string => Boolean(value));
  return <main aria-busy={!state.categories} className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-10 sm:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7"><div><Link href="/privado" className="font-semibold">Registro de Gastos</Link><p className="mt-2 text-sm text-stone-500">{includeHouse ? "Esta actividad incluye los movimientos de Casa Nueva. Los pendientes no afectan saldos ni totales." : "Casa Nueva está excluida de los movimientos habituales. Los pendientes no afectan saldos ni totales."}</p></div></header>
    <section className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Actividad</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Movimientos</h1></div><p className="text-sm text-stone-500">{movements.length + pendingEntries.length} {(movements.length + pendingEntries.length) === 1 ? "movimiento" : "movimientos"}{!state.categories && " registrados"}</p></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-500">{houseMode ? "Vista Casa Nueva · desde el inicio hasta hoy" : "Gastos de Casa Nueva excluidos de la vista habitual"}</p><Link href={houseMode ? "/privado/historial" : `/privado/historial?house=true&endDate=${today}`} className="min-h-11 rounded-lg border border-emerald-700/30 px-4 py-3 text-sm font-semibold text-emerald-800">{houseMode ? "Volver a movimientos habituales" : "Ver gastos casa"}</Link></div>
      <CategoryNotice {...state} />
      <MovementFilters key={JSON.stringify(filterValues) + houseMode + includeHouse + spendingOnly} categoriesReady={!!state.categories} accounts={accounts} categories={categories} values={{ ...filterValues, categoryIds: effectiveCategoryIds }} houseMode={houseMode} includeHouse={includeHouse} spendingOnly={spendingOnly} summary={activeSummary} />
      {(summary.expenses.length > 0 || summary.income.length > 0) && <section className="mt-6 flex flex-wrap gap-3" aria-label="Totales de movimientos"><h2 className="sr-only">Totales filtrados</h2>{summary.expenses.map((item) => <p key={`expense-${item.currency}`} className="rounded-xl border border-stone-300/15 px-4 py-3 text-sm"><span className="text-stone-500">Gastos {item.currency}</span><strong className="ml-3">{formatMoneyAmount(item.currency, item.amount)}</strong></p>)}{summary.income.map((item) => <p key={`income-${item.currency}`} className="rounded-xl border border-stone-300/15 px-4 py-3 text-sm"><span className="text-stone-500">Ingresos {item.currency}</span><strong className="ml-3">{formatMoneyAmount(item.currency, item.amount)}</strong></p>)}</section>}
      {movements.length === 0 && pendingEntries.length === 0 && !state.categories && allPending.length > 0 ? <p role="status" className="mt-8 text-sm">Las entradas pendientes se mostrarán cuando estén disponibles las categorías.</p> : movements.length === 0 && pendingEntries.length === 0 ? <p className="mt-8 rounded-xl border border-stone-300/15 p-6 text-sm text-stone-500">No hay movimientos con estos filtros.{" "}<Link className="underline" href={houseMode ? "/privado/historial?house=true" : "/privado/historial"}>Limpiar filtros</Link></p> : <MovementTable categoriesReady={!!state.categories} onCategoryRejected={() => void state.refresh(true)} movements={movements} pendingEntries={pendingEntries} accounts={accounts} categories={categories} />}
    </section>
  </main>;
}
