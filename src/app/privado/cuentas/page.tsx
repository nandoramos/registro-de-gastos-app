import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountsManager } from "@/components/accounts-manager";
import { SignOutButton } from "@/components/auth-buttons";
import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { listAccounts } from "@/modules/accounts/service";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  let access;
  try {
    access = await getAccess(await headers());
  } catch {
    redirect("/login?error=unavailable");
  }
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "forbidden") redirect("/login?error=access");

  let accounts;
  try {
    accounts = await listAccounts(getAuthRuntime().db, access.userId);
  } catch {
    redirect("/login?error=unavailable");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <Link href="/privado" className="font-semibold">
          Registro de Gastos
        </Link>
        <SignOutButton />
      </header>
      <div className="py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Configuración
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Cuentas</h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          Identificá dónde mantenés tu dinero. Una cuenta bancaria o de efectivo
          se configura por separado para cada moneda.
        </p>
        <div className="mt-10">
          <AccountsManager initialAccounts={accounts} />
        </div>
      </div>
    </main>
  );
}
