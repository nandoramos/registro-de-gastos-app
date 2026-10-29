import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth-buttons";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getConversionDetail } from "@/modules/conversions/service";
import { formatMoneyAmount } from "@/modules/money/format";

export const dynamic = "force-dynamic";

export default async function ConversionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAuthorizedPage();
  let conversion;
  try {
    conversion = await getConversionDetail(
      getAuthRuntime().db,
      access.userId,
      (await params).id,
    );
  } catch {
    redirect("/login?error=unavailable");
  }
  if (!conversion) notFound();
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
          Conversión
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {conversion.title}
        </h1>
        {conversion.voidedAt && <p className="mt-3 font-medium text-amber-800">Este movimiento está anulado.</p>}
        <div className="mt-6"><MovementStatusActions type="conversion" id={conversion.id} voided={Boolean(conversion.voidedAt)} /></div>
        <p className="mt-3 text-stone-600">
          {conversion.operationDate} · {conversion.withdrawal ? "Retiro y conversión" : "Conversión"}; no participa en los totales de gastos.
        </p>
        <dl className="mt-8 grid gap-5 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Importe debitado
            </dt>
            <dd className="mt-1 font-medium">
              {conversion.source.account.name}
            </dd>
            <dd className="text-lg font-semibold">
              {formatMoneyAmount(conversion.source.currency, conversion.source.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Importe acreditado
            </dt>
            <dd className="mt-1 font-medium">
              {conversion.destination.account.name}
            </dd>
            <dd className="text-lg font-semibold">
              {formatMoneyAmount(conversion.destination.currency, conversion.destination.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Cambio efectivo
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {conversion.effectiveRateDisplay}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Institución
            </dt>
            <dd className="mt-1 font-medium">
              {conversion.institution?.name ?? "Sin indicar"}
            </dd>
          </div>
          {conversion.note && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-stone-500">
                Nota
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{conversion.note}</dd>
            </div>
          )}
        </dl>
        <section className="mt-8 rounded-2xl bg-stone-100 p-6">
          <h2 className="text-xl font-semibold">Evidencia original</h2>
          <p className="mt-3 text-sm text-stone-600">
            Entrada manual recibida el{" "}
            {conversion.evidence.receivedAt.toLocaleString("es-UY")}.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">
            {JSON.stringify(conversion.evidence.original, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
