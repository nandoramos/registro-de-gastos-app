import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccess } from "@/modules/auth/server";
import { SignOutButton } from "@/components/auth-buttons";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function PrivateHome() {
  let access;
  try {
    access = await getAccess(await headers());
  } catch {
    redirect("/login?error=unavailable");
  }
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "forbidden") redirect("/login?error=access");
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
          Tu sesión está activa. La carga de gastos y el resumen mensual estarán
          disponibles en los próximos pasos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/privado/cuentas"
            className="inline-flex min-h-12 items-center rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
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
