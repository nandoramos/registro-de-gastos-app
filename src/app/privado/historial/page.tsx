import Link from "next/link";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listAccounts } from "@/modules/accounts/service";
import { listCategories } from "@/modules/categories/service";
import { listMovementHistory, type HistoryFilters } from "@/modules/movements/history";
import { MovementTable } from "@/components/movement-table";
import { listPendingEntries } from "@/modules/pending-entries/service";

export const dynamic = "force-dynamic";
function currentMonth() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit" }).format(new Date()); }

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await requireAuthorizedPage();
  const raw = await searchParams;
  const filters: HistoryFilters = { ...raw, month: raw.month ?? currentMonth(), includeHouse: raw.includeHouse === "true", includeVoided: raw.includeVoided === "true" };
  const db = getAuthRuntime().db;
  const [movements, accounts, categories, pendingEntries] = await Promise.all([
    listMovementHistory(db, access.userId, filters),
    listAccounts(db, access.userId, true),
    listCategories(db, access.userId, true),
    listPendingEntries(db, access.userId),
  ]);
  return <main className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-10 sm:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7"><div><Link href="/privado" className="font-semibold">Registro de Gastos</Link><p className="mt-2 text-sm text-stone-600">Casa Nueva y los anulados están ocultos por defecto.</p></div></header>
    <section className="py-8 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Actividad</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Movimientos</h1></div><p className="text-sm text-stone-600">{movements.length} {movements.length === 1 ? "movimiento" : "movimientos"}</p></div>
      <form className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros de movimientos">
        <label className="grid gap-1 text-xs font-medium text-stone-600">Mes<input type="month" name="month" defaultValue={filters.month} className="min-h-11 rounded-lg border border-stone-300 px-3" /></label>
        <label className="grid gap-1 text-xs font-medium text-stone-600">Cuenta<select name="accountId" defaultValue={filters.accountId} className="min-h-11 rounded-lg border border-stone-300 px-3"><option value="">Todas las cuentas</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-stone-600">Categoría<select name="categoryId" defaultValue={filters.categoryId} className="min-h-11 rounded-lg border border-stone-300 px-3"><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-stone-600">Tipo<select name="type" defaultValue={filters.type} className="min-h-11 rounded-lg border border-stone-300 px-3"><option value="">Todos</option><option value="expense">Gasto</option><option value="income">Ingreso</option><option value="transfer">Transferencia</option><option value="withdrawal">Retiro</option><option value="conversion">Conversión</option><option value="adjustment">Ajuste manual</option></select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includeHouse" value="true" defaultChecked={filters.includeHouse} />Incluir Casa Nueva</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includeVoided" value="true" defaultChecked={filters.includeVoided} />Mostrar anulados</label>
        <button className="min-h-11 rounded-lg bg-emerald-900 px-4 font-semibold text-white lg:col-span-2">Aplicar filtros</button>
      </form>
      {pendingEntries.length > 0 && <section className="mt-8 rounded-2xl border border-amber-300/40 bg-amber-300/5 p-4 sm:p-6" aria-labelledby="pending-movements-heading">
        <div className="flex items-center justify-between gap-4"><h2 id="pending-movements-heading" className="text-lg font-semibold">Pendientes ({pendingEntries.length})</h2><p className="text-sm text-stone-500">No afectan saldos ni totales</p></div>
        <ul className="mt-4 divide-y divide-stone-200/10">{pendingEntries.map((entry) => {
          const type = entry.interpretation.entryType === "income" ? "Ingreso" : entry.interpretation.entryType === "own-transfer" ? "Transferencia / retiro" : entry.interpretation.entryType === "conversion" ? "Conversión" : "Gasto";
          const title = typeof entry.interpretation.title === "string" && entry.interpretation.title ? entry.interpretation.title : `${type} sin detalle`;
          const date = typeof entry.interpretation.operationDate === "string" ? entry.interpretation.operationDate : "Sin fecha";
          return <li key={entry.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-medium"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />{title}</p><p className="mt-1 text-xs text-stone-500">Pendiente · {type} · {date}</p></div><Link aria-label={`Editar ${title}`} href={`/privado/pendientes/${entry.id}`} className="shrink-0 rounded-lg border border-stone-300/20 px-3 py-2 text-sm">✎ Editar</Link></li>;
        })}</ul>
      </section>}
      <MovementTable movements={movements} accounts={accounts} categories={categories} />
    </section>
  </main>;
}
