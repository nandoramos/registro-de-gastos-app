import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingEntryForm } from "@/components/pending-entry-form";
import { TransferForm } from "@/components/transfer-form";
import { ConversionForm } from "@/components/conversion-form";
import { EmailTransferChoiceForm } from "@/components/email-transfer-choice-form";
import { EntryStatusActions } from "@/components/entry-status-actions";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listAccounts } from "@/modules/accounts/service";
import { listCategories } from "@/modules/categories/service";
import {
  countPendingEntries,
  getPendingEntry,
} from "@/modules/pending-entries/service";

export const dynamic = "force-dynamic";
export default async function PendingEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAuthorizedPage();
  const db = getAuthRuntime().db;
  const [entry, accounts, categories, pendingCount] = await Promise.all([
    getPendingEntry(db, access.userId, (await params).id),
    listAccounts(db, access.userId).then((items) => items.filter((account) => account.openingBalance != null)),
    listCategories(db, access.userId),
    countPendingEntries(db, access.userId),
  ]);
  if (!entry) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <Link href="/privado/pendientes" className="font-semibold underline">
        Volver a pendientes ({pendingCount})
      </Link>
      <h1 className="mt-10 text-4xl font-semibold">Completar entrada</h1>
      <div className="mt-8 rounded-2xl border bg-white p-6">
        {entry.interpretation.entryType === "email-transfer-choice" ? (
          <EmailTransferChoiceForm
            entryId={entry.id}
            accounts={accounts}
            categories={categories}
          />
        ) : entry.interpretation.entryType === "conversion" ? (
          <ConversionForm entry={entry} accounts={accounts} />
        ) : entry.interpretation.entryType === "own-transfer" ? (
          <TransferForm entry={entry} accounts={accounts} />
        ) : (
          <PendingEntryForm
            entry={entry}
            accounts={accounts}
            categories={categories}
          />
        )}
      </div>
      <div className="mt-6">
        <EntryStatusActions entryId={entry.id} status="pending" />
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
