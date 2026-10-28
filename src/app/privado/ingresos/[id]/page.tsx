import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IncomeEditForm } from "@/components/income-edit-form";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { SignOutButton } from "@/components/auth-buttons";
import { listAccounts } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getIncomeDetail } from "@/modules/incomes/service";

export const dynamic = "force-dynamic";

export default async function IncomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAuthorizedPage();
  let income;
  let accounts;
  try {
    const id = (await params).id;
    [income, accounts] = await Promise.all([
      getIncomeDetail(getAuthRuntime().db, access.userId, id),
      listAccounts(getAuthRuntime().db, access.userId, true),
    ]);
  } catch {
    redirect("/login?error=unavailable");
  }
  if (!income) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <Link href="/privado" className="font-semibold">Registro de Gastos</Link>
        <SignOutButton />
      </header>
      <div className="py-10 sm:py-14">
        <Link href="/privado/ingresos/nuevo" className="text-sm font-semibold text-emerald-900 underline underline-offset-4">Registrar otro ingreso</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Ingreso registrado</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{income.title}</h1>
        {income.voidedAt && <p className="mt-3 font-medium text-amber-800">Este movimiento está anulado y no participa en saldos ni totales.</p>}
        <div className="mt-6">
          <MovementStatusActions type="income" id={income.id} voided={Boolean(income.voidedAt)} />
        </div>
        <p className="mt-4 text-2xl font-semibold text-emerald-700">+ {income.currency} {income.amount}</p>
        <dl className="mt-10 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-stone-500">Fecha</dt><dd className="mt-1 font-medium">{income.operationDate}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-stone-500">Hora</dt><dd className="mt-1 font-medium">{income.operationTime?.slice(0, 5) ?? "No indicada"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-stone-500">Cuenta</dt><dd className="mt-1 font-medium">{income.account.name}</dd></div>
          {income.note && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-stone-500">Nota</dt><dd className="mt-1 whitespace-pre-wrap">{income.note}</dd></div>}
        </dl>
        {!income.voidedAt && <section className="mt-8"><h2 className="text-xl font-semibold">Editar ingreso</h2><IncomeEditForm income={income} accounts={accounts} /></section>}
      </div>
    </main>
  );
}
