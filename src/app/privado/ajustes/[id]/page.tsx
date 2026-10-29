import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdjustmentEditForm } from "@/components/adjustment-edit-form";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { listAccounts } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getAdjustmentDetail } from "@/modules/adjustments/service";
import { formatMoneyAmount } from "@/modules/money/format";

export const dynamic = "force-dynamic";
export default async function AdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAuthorizedPage(); let adjustment; let accounts;
  try { const id = (await params).id; [adjustment, accounts] = await Promise.all([getAdjustmentDetail(getAuthRuntime().db, access.userId, id), listAccounts(getAuthRuntime().db, access.userId, true)]); }
  catch { redirect("/login?error=unavailable"); }
  if (!adjustment) notFound();
  const increase = adjustment.direction === "increase";
  return <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12"><header className="border-b border-stone-200 pb-7"><Link href="/privado" className="font-semibold">Registro de Gastos</Link></header><section className="py-10 sm:py-14"><Link href="/privado/ajustes/nuevo" className="text-sm font-semibold text-emerald-900 underline">Nuevo ajuste manual</Link><p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Movimiento registrado</p><h1 className="mt-4 text-4xl font-semibold">{adjustment.title}</h1>{adjustment.voidedAt && <p className="mt-3 font-medium text-amber-800">Este movimiento está anulado y no participa en saldos ni totales.</p>}<div className="mt-6"><MovementStatusActions type="adjustment" id={adjustment.id} voided={Boolean(adjustment.voidedAt)} /></div><p className={`mt-5 text-2xl font-semibold ${increase ? "text-emerald-700" : "text-red-700"}`}>{increase ? "+" : "−"} {formatMoneyAmount(adjustment.currency, adjustment.amount)}</p><dl className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-stone-500">Fecha</dt><dd className="mt-1 font-medium">{adjustment.operationDate}</dd></div><div><dt className="text-xs uppercase tracking-wide text-stone-500">Cuenta</dt><dd className="mt-1 font-medium">{adjustment.account}</dd></div>{!increase && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Categoría</dt><dd className="mt-1 font-medium">{adjustment.category}</dd></div>}{adjustment.note && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-stone-500">Nota</dt><dd className="mt-1 whitespace-pre-wrap">{adjustment.note}</dd></div>}</dl>{!adjustment.voidedAt && <section className="mt-8"><h2 className="text-xl font-semibold">Editar ajuste manual</h2><AdjustmentEditForm adjustment={{ id: adjustment.id, accountId: adjustment.accountId, operationDate: adjustment.operationDate, direction: adjustment.direction, amount: adjustment.amount, title: adjustment.title, note: adjustment.note }} accounts={accounts} /></section>}</section></main>;
}
