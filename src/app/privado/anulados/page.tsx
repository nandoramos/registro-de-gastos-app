import Link from "next/link";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listVoidedMovements } from "@/modules/movements/status";
export const dynamic = "force-dynamic";
const paths = { expense: "gastos", income: "ingresos", transfer: "transferencias", withdrawal: "transferencias", conversion: "conversiones" };
const labels = { expense: "Gasto", income: "Ingreso", transfer: "Transferencia", withdrawal: "Retiro", conversion: "Conversión" };
export default async function VoidedMovementsPage() {
  const access = await requireAuthorizedPage(); const movements = await listVoidedMovements(getAuthRuntime().db, access.userId);
  return <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10"><Link href="/privado" className="font-semibold">Registro de Gastos</Link><h1 className="mt-12 text-4xl font-semibold">Movimientos anulados</h1><p className="mt-4 text-stone-600">No participan en los totales. Podés abrirlos para restaurarlos.</p><ul className="mt-8 grid gap-3">{movements.map((movement) => <li key={`${movement.type}-${movement.id}`} className="rounded-2xl border bg-white p-5"><p className="text-sm text-stone-500">{labels[movement.type]} · {movement.operationDate}</p><Link href={`/privado/${paths[movement.type]}/${movement.id}`} className="mt-1 inline-block font-semibold underline">{movement.title}</Link></li>)}</ul>{movements.length === 0 && <p className="mt-8 text-stone-600">No hay movimientos anulados.</p>}</main>;
}
