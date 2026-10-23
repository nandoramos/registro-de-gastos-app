import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { countPendingEntries } from "@/modules/pending-entries/service";
import { SignOutButton } from "@/components/auth-buttons";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function PrivateHome() {
  const access = await requireAuthorizedPage();
  const pendingCount = await countPendingEntries(
    getAuthRuntime().db,
    access.userId,
  );
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <span className="font-semibold">Registro de Gastos</span>
        <SignOutButton />
      </header>
      <section className="max-w-xl py-16 sm:py-24">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Acceso autorizado
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Este es tu espacio.
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          Tu sesión está activa. Ya podés registrar un gasto manual con su
          cuenta, categoría y evidencia.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/privado/gastos/nuevo"
            className="inline-flex min-h-12 items-center rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Registrar gasto
          </Link>
          <Link
            href="/privado/pendientes"
            className="inline-flex min-h-12 items-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
          >
            Ver pendientes ({pendingCount})
          </Link>
          <Link
            href="/privado/descartadas"
            className="inline-flex min-h-12 items-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
          >
            Ver descartadas
          </Link>
          <Link
            href="/privado/cuentas"
            className="inline-flex min-h-12 items-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
          >
            Configurar cuentas
          </Link>
          <Link
            href="/privado/categorias"
            className="inline-flex min-h-12 items-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
          >
            Configurar categorías
          </Link>
        </div>
      </section>
    </main>
  );
}
