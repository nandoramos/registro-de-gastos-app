import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth-buttons";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getTransferDetail } from "@/modules/transfers/service";

export const dynamic = "force-dynamic";

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAuthorizedPage();
  let transfer;
  try {
    transfer = await getTransferDetail(
      getAuthRuntime().db,
      access.userId,
      (await params).id,
    );
  } catch {
    redirect("/login?error=unavailable");
  }
  if (!transfer) notFound();
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
          {transfer.kind === "withdrawal" ? "Retiro" : "Transferencia propia"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {transfer.title}
        </h1>
        {transfer.voidedAt && <p className="mt-3 font-medium text-amber-800">Este movimiento está anulado.</p>}
        <div className="mt-6"><MovementStatusActions type="transfer" id={transfer.id} voided={Boolean(transfer.voidedAt)} /></div>
        <p className="mt-3 text-stone-600">
          {transfer.operationDate} · No participa en los totales de gastos.
        </p>
        <dl className="mt-8 grid gap-5 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Sale de
            </dt>
            <dd className="mt-1 font-medium">{transfer.source.account.name}</dd>
            <dd className="text-lg font-semibold">
              {transfer.source.currency} {transfer.source.amount}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Llega a
            </dt>
            <dd className="mt-1 font-medium">
              {transfer.destination.account.name}
            </dd>
            <dd className="text-lg font-semibold">
              {transfer.destination.currency} {transfer.destination.amount}
            </dd>
          </div>
          {transfer.note && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-stone-500">
                Nota
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{transfer.note}</dd>
            </div>
          )}
        </dl>
        <section className="mt-8 rounded-2xl bg-stone-100 p-6">
          <h2 className="text-xl font-semibold">Evidencia original</h2>
          <p className="mt-3 text-sm text-stone-600">
            {transfer.evidence.type === "email"
              ? "Texto de email recibido"
              : "Entrada manual recibida"}{" "}
            el {transfer.evidence.receivedAt.toLocaleString("es-UY")}.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">
            {JSON.stringify(transfer.evidence.original, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
