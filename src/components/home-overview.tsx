import Link from "next/link";
import type { CurrencyTotal } from "@/modules/summary/home";

export function HomeOverview({
  greeting,
  month,
  expenses,
  pendingCount,
}: {
  greeting: string;
  month: string;
  expenses: CurrencyTotal[];
  pendingCount: number;
}) {
  const movementHref = `/privado/historial?month=${month}&type=expense&type=adjustment&spending=true`;

  return (
    <main className="min-h-dvh px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-stone-300/10 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Inicio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-100 sm:text-4xl">{greeting}</h1>
          <p className="mt-3 text-sm text-stone-400">Este es tu resumen de gastos de este mes.</p>
        </header>

        <section className="mt-8" aria-labelledby="monthly-expenses-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="monthly-expenses-heading" className="text-lg font-semibold text-stone-100">Gastos del mes</h2>
              <p className="mt-1 text-sm text-stone-500">Casa Nueva excluida</p>
            </div>
            <Link href={movementHref} className="min-h-11 rounded-lg border border-emerald-400/30 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10">
              Ver movimientos que forman estos gastos
            </Link>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {expenses.map(({ currency, amount }) => (
              <li key={currency} className="rounded-xl border border-stone-300/10 bg-stone-900/40 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{currency}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-100">{currency} {amount}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-5" aria-labelledby="pending-heading">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="pending-heading" className="font-semibold text-stone-100">Pendientes de revisión</h2>
              <p className="mt-1 text-sm text-stone-500">De todos los meses; no afectan saldos ni gastos.</p>
            </div>
            <Link href="/privado/pendientes" className="min-h-11 rounded-lg bg-amber-300 px-4 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-200">
              Pendientes de revisión ({pendingCount})
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
