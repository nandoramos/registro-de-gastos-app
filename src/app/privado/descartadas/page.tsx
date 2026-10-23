import Link from "next/link";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listDiscardedEntries } from "@/modules/discarded-entries/service";

export const dynamic = "force-dynamic";
export default async function DiscardedEntriesPage() {
  const access = await requireAuthorizedPage();
  const entries = await listDiscardedEntries(
    getAuthRuntime().db,
    access.userId,
  );
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <Link href="/privado" className="font-semibold">
        Registro de Gastos
      </Link>
      <h1 className="mt-12 text-4xl font-semibold">Descartadas</h1>
      <p className="mt-4 text-stone-600">
        Estas entradas conservan su evidencia y no son movimientos.
      </p>
      <ul className="mt-8 grid gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-2xl border bg-white p-5">
            <Link
              href={"/privado/descartadas/" + entry.id}
              className="font-semibold underline"
            >
              {String(entry.interpretation.title || "Entrada sin título")}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
