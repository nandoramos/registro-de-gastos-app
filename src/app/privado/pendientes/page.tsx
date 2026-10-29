import Link from "next/link";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listPendingEntries } from "@/modules/pending-entries/service";
import { pendingIssueLabel } from "@/modules/pending-entries/domain";
import { ManualPendingCreateForm } from "@/components/manual-pending-create-form";

export const dynamic = "force-dynamic";
export default async function PendingEntriesPage() {
  const access = await requireAuthorizedPage();
  const entries = await listPendingEntries(getAuthRuntime().db, access.userId);
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <Link href="/privado" className="font-semibold">
        Registro de Gastos
      </Link>
      <h1 className="mt-12 text-4xl font-semibold">
        Pendientes ({entries.length})
      </h1>
      <p className="mt-4 text-stone-600">
        El contador incluye entradas de todos los meses.
      </p>
      <ManualPendingCreateForm />
      <ul className="mt-8 grid gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-2xl border bg-white p-5">
            <Link
              href={"/privado/pendientes/" + entry.id}
              className="font-semibold underline"
            >
              {String(entry.interpretation.title || "Entrada sin título")}
            </Link>
            <p className="mt-2 text-sm text-stone-600">
              {entry.issues.map(pendingIssueLabel).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
