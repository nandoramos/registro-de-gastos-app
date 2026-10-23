"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import {
  calculateDestinationAmount,
  conversionIssueLabel,
} from "@/modules/conversions/domain";
import { Button } from "@/components/ui/button";

type PendingConversion = {
  id: string;
  interpretation: Record<string, unknown>;
  issues: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

export function ConversionForm({
  accounts,
  entry,
}: {
  accounts: AccountView[];
  entry?: PendingConversion;
}) {
  const initial = entry?.interpretation ?? {};
  const firstSource = text(initial.sourceAccountId) || accounts[0]?.id || "";
  const initialSource = accounts.find((account) => account.id === firstSource);
  const firstDestination =
    text(initial.destinationAccountId) ||
    accounts.find(
      (account) =>
        account.id !== firstSource &&
        account.currency !== initialSource?.currency,
    )?.id ||
    "";
  const [operationDate, setOperationDate] = useState(
    text(initial.operationDate),
  );
  const [title, setTitle] = useState(text(initial.title));
  const [note, setNote] = useState(text(initial.note));
  const [sourceAccountId, setSourceAccountId] = useState(firstSource);
  const [destinationAccountId, setDestinationAccountId] =
    useState(firstDestination);
  const [sourceAmount, setSourceAmount] = useState(text(initial.sourceAmount));
  const [destinationAmount, setDestinationAmount] = useState(
    text(initial.destinationAmount),
  );
  const [destinationConfirmed, setDestinationConfirmed] = useState(
    bool(initial.destinationConfirmed),
  );
  const [quote, setQuote] = useState(text(initial.quote));
  const [institution, setInstitution] = useState(text(initial.institution));
  const [otherInstitutionName, setOtherInstitutionName] = useState(
    text(initial.otherInstitutionName),
  );
  const [issues, setIssues] = useState(entry?.issues ?? []);
  const [pending, setPending] = useState(false);
  const [registeredId, setRegisteredId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const sourceAccount = accounts.find(
    (account) => account.id === sourceAccountId,
  );
  const destinationAccount = accounts.find(
    (account) => account.id === destinationAccountId,
  );

  function calculate() {
    if (!sourceAccount || !sourceAmount || !quote) return;
    try {
      setDestinationAmount(
        calculateDestinationAmount(sourceAccount.currency, sourceAmount, quote),
      );
      setDestinationConfirmed(false);
    } catch {
      setIssues(["INVALID_QUOTE"]);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(
        entry ? `/api/pending-entries/${entry.id}` : "/api/conversions",
        {
          method: entry ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operationDate,
            title,
            note,
            sourceAccountId,
            destinationAccountId,
            sourceAmount,
            destinationAmount,
            sourceCurrency:
              sourceAccount?.currency ?? text(initial.sourceCurrency),
            destinationCurrency:
              destinationAccount?.currency ?? text(initial.destinationCurrency),
            destinationConfirmed,
            quote,
            institution: institution || null,
            otherInstitutionName,
          }),
        },
      );
      const body = await response.json();
      const conversion =
        body.conversion ?? (response.status === 201 ? body : undefined);
      if (conversion?.id) {
        setRegisteredId(conversion.id);
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
        <h2 className="text-xl font-semibold">Conversión registrada</h2>
        <Link
          href={`/privado/conversiones/${registeredId}`}
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-emerald-900 underline underline-offset-4"
        >
          Ver conversión
        </Link>
      </div>
    );
  }

  if (pendingId && !entry) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold">Falta completar la conversión</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {issues.map((issue) => (
            <li key={issue}>{conversionIssueLabel(issue)}</li>
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
              <li key={issue}>{conversionIssueLabel(issue)}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="text-sm font-medium">
        Fecha
        <input
          type="date"
          value={operationDate}
          onChange={(event) => setOperationDate(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Institución (opcional)
        <select
          value={institution}
          onChange={(event) => setInstitution(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Sin indicar</option>
          <option value="itau">Itaú</option>
          <option value="prex">Prex</option>
          <option value="other">Otra</option>
        </select>
      </label>
      {institution === "other" && (
        <label className="text-sm font-medium sm:col-span-2">
          Nombre de la institución
          <input
            maxLength={120}
            value={otherInstitutionName}
            onChange={(event) => setOtherInstitutionName(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border px-4"
          />
        </label>
      )}
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
          onChange={(event) => {
            setSourceAccountId(event.target.value);
            setDestinationConfirmed(false);
          }}
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
          onChange={(event) => {
            setDestinationAccountId(event.target.value);
            setDestinationConfirmed(false);
          }}
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
          onChange={(event) => {
            setSourceAmount(event.target.value);
            setDestinationConfirmed(false);
          }}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Cotización de referencia
        <input
          inputMode="decimal"
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
          placeholder="1 USD = 40,25 UYU"
        />
      </label>
      <div className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={calculate}>
          Calcular acreditación
        </Button>
        <p className="mt-2 text-sm text-stone-600">
          La cotización solo ayuda a calcular. Podés editar el resultado antes
          de confirmarlo.
        </p>
      </div>
      <label className="text-sm font-medium sm:col-span-2">
        Importe acreditado
        <input
          inputMode="decimal"
          value={destinationAmount}
          onChange={(event) => {
            setDestinationAmount(event.target.value);
            setDestinationConfirmed(false);
          }}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="flex items-center gap-3 rounded-xl bg-stone-100 p-4 text-sm font-medium sm:col-span-2">
        <input
          type="checkbox"
          checked={destinationConfirmed}
          onChange={(event) => setDestinationConfirmed(event.target.checked)}
          className="size-5"
        />
        Confirmé el importe acreditado real
      </label>
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
              : "Registrar conversión"}
        </Button>
      </div>
    </form>
  );
}
