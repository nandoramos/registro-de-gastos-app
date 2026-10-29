import Link from "next/link";
import { redirect } from "next/navigation";
import { AdjustmentForm } from "@/components/adjustment-form";
import { listAccounts } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";

export const dynamic = "force-dynamic";
export default async function NewAdjustmentPage() {
  const access = await requireAuthorizedPage();
  let accounts;
  try { accounts = (await listAccounts(getAuthRuntime().db, access.userId)).filter((account) => account.openingBalance !== null && !account.archivedAt); }
  catch { redirect("/login?error=unavailable"); }
  return <main className="mx-auto min-h-dvh max-w-6xl px-6 py-8 sm:px-12 sm:py-12"><header className="border-b border-stone-200 pb-7"><Link href="/privado" className="font-semibold">Registro de Gastos</Link></header><section className="py-10 sm:py-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Conciliación</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Ajuste manual</h1><p className="mt-4 max-w-2xl leading-7 text-stone-600">Compará el saldo calculado con el saldo que observás. La diferencia se registrará en la cuenta y actualizará los saldos y totales.</p>{accounts.length === 0 ? <p className="mt-8 rounded-xl bg-amber-50 p-5 text-amber-950">Primero necesitás <Link className="font-semibold underline" href="/privado/cuentas">crear y configurar una cuenta</Link>.</p> : <div className="mt-10"><AdjustmentForm accounts={accounts} /></div>}</section></main>;
}
