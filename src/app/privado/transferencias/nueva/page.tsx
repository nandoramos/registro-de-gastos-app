import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth-buttons";
import { TransferForm } from "@/components/transfer-form";
import { listAccountOptions } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getQuoteSettings } from "@/modules/settings/service";

export const dynamic = "force-dynamic";

export default async function NewTransferPage() {
  const access = await requireAuthorizedPage();
  let accounts;
  let quoteSettings;
  try {
    const db = getAuthRuntime().db;
    [accounts, quoteSettings] = await Promise.all([
      listAccountOptions(db, access.userId).then((items) => items.filter((account) => account.openingBalance != null)),
      getQuoteSettings(db, access.userId),
    ]);
  } catch {
    redirect("/login?error=unavailable");
  }
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <Link href="/privado" className="font-semibold">
          Registro de Gastos
        </Link>
        <SignOutButton />
      </header>
      <div className="py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Movimiento entre cuentas propias
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Registrar transferencia o retiro
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          Registrá el débito y la acreditación reales como una sola operación.
          El capital trasladado no se cuenta como gasto.
        </p>
        {accounts.length < 2 ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-5 text-amber-950">
            Necesitás al menos dos cuentas propias. Podés crearlas en{" "}
            <Link className="font-semibold underline" href="/privado/cuentas">
              configuración de cuentas
            </Link>
            .
          </p>
        ) : (
          <div className="mt-10">
            <TransferForm accounts={accounts} quoteSettings={quoteSettings} />
          </div>
        )}
      </div>
    </main>
  );
}
