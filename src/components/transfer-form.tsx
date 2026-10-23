"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import { transferIssueLabel } from "@/modules/transfers/domain";
import { Button } from "@/components/ui/button";

type PendingTransfer = {
  id: string;
  interpretation: Record<string, unknown>;
  issues: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function TransferForm({
  accounts,
  entry,
}: {
  accounts: AccountView[];
  entry?: PendingTransfer;
}) {
  const initial = entry?.interpretation ?? {};
  const [kind, setKind] = useState<"transfer" | "withdrawal">(
    initial.kind === "withdrawal" ? "withdrawal" : "transfer",
  );
  const [operationDate, setOperationDate] = useState(
    text(initial.operationDate),
  );
  const [title, setTitle] = useState(text(initial.title));
  const [note, setNote] = useState(text(initial.note));
  const [sourceAccountId, setSourceAccountId] = useState(
    text(initial.sourceAccountId) || accounts[0]?.id || "",
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    text(initial.destinationAccountId),
  );
  const [sourceAmount, setSourceAmount] = useState(text(initial.sourceAmount));
  const [destinationAmount, setDestinationAmount] = useState(
    text(initial.destinationAmount),
  );
  const [issues, setIssues] = useState(entry?.issues ?? []);
  const [pending, setPending] = useState(false);
  const [registeredId, setRegisteredId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const sourceAccount = accounts.find(
    (account) => account.id === sourceAccountId,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(
        entry ? `/api/pending-entries/${entry.id}` : "/api/transfers",
        {
          method: entry ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind,
            operationDate,
            title,
            note,
            sourceAccountId,
            destinationAccountId,
            sourceAmount,
            destinationAmount,
            currency: sourceAccount?.currency ?? text(initial.currency),
          }),
        },
      );
      const body = await response.json();
      const transfer =
        body.transfer ?? (response.status === 201 ? body : undefined);
      if (transfer?.id) {
        setRegisteredId(transfer.id);
      } else if (body.id) {
        setPendingId(body.id);
        setIssues(body.issues ?? []);
      }
    } finally {
      setPending(false);
    }
  }

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
      <label className="text-sm font-medium">
        Tipo de operación
        <select
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as "transfer" | "withdrawal")
          }
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
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Cuenta de origen
        <select
          value={sourceAccountId}
          onChange={(event) => setSourceAccountId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {accounts.map((account) => (
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
          onChange={(event) => setDestinationAccountId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Importe debitado
        <input
          inputMode="decimal"
          value={sourceAmount}
          onChange={(event) => setSourceAmount(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Importe acreditado
        <input
          inputMode="decimal"
          value={destinationAmount}
          onChange={(event) => setDestinationAmount(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm sm:col-span-2">
        Moneda: <strong>{sourceAccount?.currency ?? "—"}</strong>. En este MVP,
        los importes deben coincidir; una diferencia queda pendiente.
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
            : entry
              ? "Guardar y registrar"
              : "Registrar transferencia"}
        </Button>
      </div>
    </form>
  );
}
