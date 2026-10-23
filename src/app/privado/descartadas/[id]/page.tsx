import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryStatusActions } from "@/components/entry-status-actions";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getDiscardedEntry } from "@/modules/discarded-entries/service";

export const dynamic = "force-dynamic";
export default async function DiscardedEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAuthorizedPage();
  const entry = await getDiscardedEntry(
    getAuthRuntime().db,
    access.userId,
    (await params).id,
  );
  if (!entry) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <Link href="/privado/descartadas" className="font-semibold underline">
        Volver a descartadas
      </Link>
      <h1 className="mt-10 text-4xl font-semibold">Entrada descartada</h1>
      <p className="mt-4 text-stone-600">
        No participa en movimientos ni totales.
      </p>
      <div className="mt-8">
        <EntryStatusActions entryId={entry.id} status="discarded" />
      </div>
      <section className="mt-8 rounded-2xl bg-stone-100 p-6">
        <h2 className="font-semibold">Evidencia original</h2>
        <pre className="mt-4 overflow-x-auto text-xs">
          {JSON.stringify(entry.original, null, 2)}
        </pre>
      </section>
    </main>
  );
}
