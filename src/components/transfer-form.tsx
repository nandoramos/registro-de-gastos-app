"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { TransferDetail } from "@/modules/transfers/domain";
import { transferIssueLabel } from "@/modules/transfers/domain";
import { currentExpenseDateTime } from "@/components/expense-fields";
import { Button } from "@/components/ui/button";

type PendingTransfer = {
  id: string;
  interpretation: Record<string, unknown>;
  issues: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function eligibleDestinations(
  accounts: AccountView[],
  sourceAccountId: string,
  kind: "transfer" | "withdrawal",
) {
  const source = accounts.find((account) => account.id === sourceAccountId);
  return accounts.filter((account) => {
    if (account.id === sourceAccountId || account.currency !== source?.currency) return false;
    if (kind === "withdrawal") return account.kind === "cash";
    return !(source?.kind === "bank" && account.kind === "cash");
  });
}

function suggestedDestination(kind: "transfer" | "withdrawal", options: AccountView[]) {
  if (kind === "withdrawal") {
    return options.find((account) => account.name.toLocaleLowerCase("es-UY") === "billetera")?.id ?? options[0]?.id ?? "";
  }
  return options[0]?.id ?? "";
}

function suggestedOperationTitle(
  accounts: AccountView[],
  kind: "transfer" | "withdrawal",
  sourceId: string,
  destinationId: string,
) {
  const source = accounts.find((account) => account.id === sourceId);
  const destination = accounts.find((account) => account.id === destinationId);
  if (!source || !destination) return "";
  return `${kind === "withdrawal" ? "Retiro" : "Transferencia"}: ${source.name} → ${destination.name}`;
}

export function TransferForm({
  accounts,
  entry,
  transfer,
}: {
  accounts: AccountView[];
  entry?: PendingTransfer;
  transfer?: TransferDetail;
}) {
  const router = useRouter();
  const initial = entry?.interpretation ?? {};
  const now = currentExpenseDateTime();
  const existing = transfer;
  const initialSourceId = existing?.source.account.id ?? (text(initial.sourceAccountId) || accounts.find((a) => a.kind === "bank")?.id || accounts[0]?.id || "");
  const initialKind = existing?.kind ?? (initial.kind === "withdrawal" ? "withdrawal" : "transfer");
  const possibleDestinations = eligibleDestinations(accounts, initialSourceId, initialKind);
  const initialDestinationId = existing?.destination.account.id ?? (text(initial.destinationAccountId) || suggestedDestination(initialKind, possibleDestinations));
  const suggestedInitialTitle = suggestedOperationTitle(accounts, initialKind, initialSourceId, initialDestinationId);
  const [kind, setKind] = useState<"transfer" | "withdrawal">(
    initialKind,
  );
  const [operationDate, setOperationDate] = useState(
    existing?.operationDate ?? (text(initial.operationDate) || now.operationDate),
  );
  const [title, setTitle] = useState(existing?.title ?? (text(initial.title) || suggestedInitialTitle));
  const [titleEdited, setTitleEdited] = useState(Boolean(existing?.title || initial.title));
  const [note, setNote] = useState(existing?.note ?? text(initial.note));
  const [sourceAccountId, setSourceAccountId] = useState(
    initialSourceId,
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    initialDestinationId,
  );
  const [sourceAmount, setSourceAmount] = useState(existing?.source.amount ?? text(initial.sourceAmount));
  const [destinationAmount, setDestinationAmount] = useState(
    existing?.destination.amount ?? text(initial.destinationAmount),
  );
  const [issues, setIssues] = useState(entry?.issues ?? []);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [registeredId, setRegisteredId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const sourceAccount = accounts.find(
    (account) => account.id === sourceAccountId,
  );
  const destinationOptions = eligibleDestinations(accounts, sourceAccountId, kind);

  function updateTitleSuggestion(nextKind: "transfer" | "withdrawal", sourceId: string, destinationId: string) {
    if (!titleEdited) setTitle(suggestedOperationTitle(accounts, nextKind, sourceId, destinationId));
  }

  function updateKind(nextKind: "transfer" | "withdrawal") {
    setKind(nextKind);
    let nextDestination = destinationAccountId;
    const options = eligibleDestinations(accounts, sourceAccountId, nextKind);
    if (!options.some((account) => account.id === nextDestination)) {
      nextDestination = suggestedDestination(nextKind, options);
      setDestinationAccountId(nextDestination);
    }
    updateTitleSuggestion(nextKind, sourceAccountId, nextDestination);
  }

  function updateSource(nextSource: string) {
    setSourceAccountId(nextSource);
    const options = eligibleDestinations(accounts, nextSource, kind);
    let nextDestination = destinationAccountId;
    if (!options.some((account) => account.id === nextDestination)) {
      nextDestination = suggestedDestination(kind, options);
      setDestinationAccountId(nextDestination);
    }
    updateTitleSuggestion(kind, nextSource, nextDestination);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(
        entry ? `/api/pending-entries/${entry.id}` : existing ? `/api/transfers/${existing.id}` : "/api/transfers",
        {
          method: entry || existing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind,
            operationDate,
            title,
            note,
            sourceAccountId,
            destinationAccountId,
            sourceAmount,
            destinationAmount: entry ? destinationAmount : sourceAmount,
            currency: sourceAccount?.currency ?? text(initial.currency),
          }),
        },
      );
      const body = await response.json();
      const savedTransfer = body.transfer ?? (response.status === 201 || (existing && response.ok) ? body : undefined);
      if (savedTransfer?.id) {
        if (existing) {
          setSaved(true);
          router.refresh();
        }
        else setRegisteredId(savedTransfer.id);
      } else if (body.id) {
        setPendingId(body.id);
        setIssues(body.issues ?? []);
      } else {
        setError(body.error ?? "No se pudo guardar la operación.");
      }
    } catch {
      setError("No se pudo guardar la operación. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (saved) return <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">Cambios guardados.</p>;

  if (registeredId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-semibold">Operación registrada</h2>
        <Link
          href={`/privado/transferencias/${registeredId}`}
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-emerald-900 underline underline-offset-4"
        >
          Ver operación
        </Link>
      </div>
    );
  }

  if (pendingId && !entry) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold">Falta completar la operación</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {issues.map((issue) => (
            <li key={issue}>{transferIssueLabel(issue)}</li>
          ))}
        </ul>
        <Link
          href={`/privado/pendientes/${pendingId}`}
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-amber-950 underline underline-offset-4"
        >
          Completar entrada pendiente
        </Link>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      onSubmit={submit}
    >
      {issues.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2">
          <p className="font-semibold">Falta resolver:</p>
          <ul className="mt-2 list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue}>{transferIssueLabel(issue)}</li>
            ))}
          </ul>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 sm:col-span-2">{error}</p>}
      <label className="text-sm font-medium">
        Tipo de operación
        <select
          value={kind}
          onChange={(event) => updateKind(event.target.value as "transfer" | "withdrawal")}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="transfer">Transferencia propia</option>
          <option value="withdrawal">Retiro hacia efectivo</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Fecha
        <input
          type="date"
          value={operationDate}
          onChange={(event) => setOperationDate(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Título
        <input
          maxLength={120}
          value={title}
          onChange={(event) => { setTitleEdited(true); setTitle(event.target.value); }}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Cuenta de origen
        <select
          value={sourceAccountId}
          onChange={(event) => updateSource(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {accounts.filter((account) => account.id !== destinationAccountId || account.id === sourceAccountId).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Cuenta de destino
        <select
          value={destinationAccountId}
          onChange={(event) => { setDestinationAccountId(event.target.value); updateTitleSuggestion(kind, sourceAccountId, event.target.value); }}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {destinationOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        {entry ? "Importe debitado" : "Importe"}
        <input
          inputMode="decimal"
          value={sourceAmount}
          onChange={(event) => { setSourceAmount(event.target.value); if (!entry) setDestinationAmount(event.target.value); }}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      {entry && <label className="text-sm font-medium">
        Importe acreditado
        <input
          inputMode="decimal"
          value={destinationAmount}
          onChange={(event) => setDestinationAmount(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>}
      <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm sm:col-span-2">
        Moneda: <strong>{sourceAccount?.currency ?? "—"}</strong>. Los importes
        de origen y destino deben coincidir en transferencias de la misma moneda.
      </p>
      <label className="text-sm font-medium sm:col-span-2">
        Nota (opcional)
        <textarea
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </label>
      <div className="sm:col-span-2">
        <Button disabled={pending}>
          {pending
            ? "Guardando…"
            : existing
              ? "Guardar cambios"
              : entry
              ? "Guardar y registrar"
              : "Registrar transferencia"}
        </Button>
      </div>
    </form>
  );
}
