"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { TransferDetail } from "@/modules/transfers/domain";
import { transferIssueLabel } from "@/modules/transfers/domain";
import {
  calculateDestinationAmount,
  calculateEffectiveRate,
  conversionIssueLabel,
  displayEffectiveRate,
} from "@/modules/conversions/domain";
import { currentExpenseDateTime } from "@/components/expense-fields";
import { Button } from "@/components/ui/button";
import { SavePendingButton } from "@/components/save-pending-button";
import {
  DEFAULT_QUOTE_SETTINGS,
  quoteForConversion,
  type QuoteSettings,
} from "@/modules/settings/domain";

type PendingTransfer = {
  id: string;
  interpretation: Record<string, unknown>;
  issues: string[];
};

type OperationKind = "transfer" | "withdrawal" | "conversion" | "conversion-withdrawal";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function eligibleDestinations(
  accounts: AccountView[],
  sourceAccountId: string,
  allowCurrencyChange: boolean,
) {
  const source = accounts.find((account) => account.id === sourceAccountId);
  return accounts.filter((account) =>
    account.id !== sourceAccountId &&
    account.archivedAt == null &&
    (allowCurrencyChange || account.currency === source?.currency),
  );
}

function suggestedDestination(
  accounts: AccountView[],
  sourceAccountId: string,
  allowCurrencyChange: boolean,
  preferredKind: "transfer" | "withdrawal",
) {
  const options = eligibleDestinations(accounts, sourceAccountId, allowCurrencyChange);
  if (preferredKind === "withdrawal") {
    return options.find((account) => account.kind === "cash" && account.name.toLocaleLowerCase("es-UY") === "billetera")?.id ??
      options.find((account) => account.kind === "cash")?.id ?? options[0]?.id ?? "";
  }
  const source = accounts.find((account) => account.id === sourceAccountId);
  const sameCurrency = options.filter((account) => account.currency === source?.currency);
  return (source?.kind === "bank" ? sameCurrency.find((account) => account.kind === "bank") : undefined)?.id ??
    sameCurrency[0]?.id ??
    (source?.kind === "bank" ? options.find((account) => account.kind === "bank") : undefined)?.id ??
    options[0]?.id ?? "";
}

function operationKind(source?: AccountView, destination?: AccountView): OperationKind {
  if (!source || !destination) return "transfer";
  const withdrawal = source.kind === "bank" && destination.kind === "cash";
  if (source.currency !== destination.currency) return withdrawal ? "conversion-withdrawal" : "conversion";
  return withdrawal ? "withdrawal" : "transfer";
}

function operationLabel(kind: OperationKind) {
  return kind === "conversion-withdrawal" ? "Conversión y retiro" :
    kind === "conversion" ? "Conversión" :
      kind === "withdrawal" ? "Retiro" : "Transferencia";
}

function suggestedOperationTitle(
  accounts: AccountView[],
  sourceId: string,
  destinationId: string,
) {
  const source = accounts.find((account) => account.id === sourceId);
  const destination = accounts.find((account) => account.id === destinationId);
  if (!source || !destination) return "";
  return `${operationLabel(operationKind(source, destination))}: ${source.name} → ${destination.name}`;
}

export function TransferForm({
  accounts,
  entry,
  transfer,
  quoteSettings = DEFAULT_QUOTE_SETTINGS,
  onSaved,
}: {
  accounts: AccountView[];
  entry?: PendingTransfer;
  transfer?: TransferDetail;
  quoteSettings?: QuoteSettings;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const initial = entry?.interpretation ?? {};
  const now = currentExpenseDateTime();
  const existing = transfer;
  const canConvert = !entry && !existing;
  const initialSourceId = existing?.source.account.id ?? (
    text(initial.sourceAccountId) || accounts.find((account) => account.kind === "bank" && !account.archivedAt)?.id ||
    accounts.find((account) => !account.archivedAt)?.id || ""
  );
  const initialKind = existing?.kind ?? (initial.kind === "withdrawal" ? "withdrawal" : "transfer");
  const initialDestinationId = existing?.destination.account.id ?? (
    text(initial.destinationAccountId) || suggestedDestination(accounts, initialSourceId, canConvert, initialKind)
  );
  const sourceInitialAccount = accounts.find((account) => account.id === initialSourceId);
  const destinationInitialAccount = accounts.find((account) => account.id === initialDestinationId);
  const initialQuote = sourceInitialAccount && destinationInitialAccount && sourceInitialAccount.currency !== destinationInitialAccount.currency
    ? quoteForConversion(sourceInitialAccount.currency, destinationInitialAccount.currency, quoteSettings) ?? ""
    : "";
  const [operationDate, setOperationDate] = useState(existing?.operationDate ?? (text(initial.operationDate) || now.operationDate));
  const [title, setTitle] = useState(existing?.title ?? (text(initial.title) || suggestedOperationTitle(accounts, initialSourceId, initialDestinationId)));
  const [titleEdited, setTitleEdited] = useState(Boolean(existing?.title || initial.title));
  const [note, setNote] = useState(existing?.note ?? text(initial.note));
  const [sourceAccountId, setSourceAccountId] = useState(initialSourceId);
  const [destinationAccountId, setDestinationAccountId] = useState(initialDestinationId);
  const [sourceAmount, setSourceAmount] = useState(existing?.source.amount ?? text(initial.sourceAmount));
  const [destinationAmount, setDestinationAmount] = useState(existing?.destination.amount ?? text(initial.destinationAmount));
  const [destinationConfirmed, setDestinationConfirmed] = useState(false);
  const [quote, setQuote] = useState(text(initial.quote) || initialQuote);
  const [institution, setInstitution] = useState(text(initial.institution));
  const [otherInstitutionName, setOtherInstitutionName] = useState(text(initial.otherInstitutionName));
  const [issues, setIssues] = useState(entry?.issues ?? []);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [registeredId, setRegisteredId] = useState<string>();
  const [registeredKind, setRegisteredKind] = useState<"transfer" | "conversion">("transfer");
  const [pendingId, setPendingId] = useState<string>();
  const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const kind = operationKind(sourceAccount, destinationAccount);
  const isConversion = kind === "conversion" || kind === "conversion-withdrawal";
  const isWithdrawal = kind === "withdrawal" || kind === "conversion-withdrawal";
  const destinationOptions = eligibleDestinations(accounts, sourceAccountId, canConvert);
  const quoteDirection = sourceAccount?.currency === "USD" && destinationAccount?.currency === "UYU" ? "compra" : "venta";
  let effectiveRate: string | undefined;
  if (isConversion && sourceAccount && destinationAccount && sourceAmount && destinationAmount) {
    try {
      effectiveRate = displayEffectiveRate(calculateEffectiveRate(sourceAccount.currency, sourceAmount, destinationAccount.currency, destinationAmount));
    } catch {
      effectiveRate = undefined;
    }
  }

  function updateTitleSuggestion(sourceId: string, destinationId: string) {
    if (!titleEdited) setTitle(suggestedOperationTitle(accounts, sourceId, destinationId));
  }

  function updateQuote(sourceId: string, destinationId: string) {
    const source = accounts.find((account) => account.id === sourceId);
    const destination = accounts.find((account) => account.id === destinationId);
    const suggested = source && destination && source.currency !== destination.currency
      ? quoteForConversion(source.currency, destination.currency, quoteSettings)
      : undefined;
    setQuote(suggested ?? "");
  }

  function updateSource(nextSourceId: string) {
    setSourceAccountId(nextSourceId);
    const options = eligibleDestinations(accounts, nextSourceId, canConvert);
    const nextDestinationId = options.some((account) => account.id === destinationAccountId)
      ? destinationAccountId
      : suggestedDestination(accounts, nextSourceId, canConvert, initialKind);
    setDestinationAccountId(nextDestinationId);
    const nextSource = accounts.find((account) => account.id === nextSourceId);
    const nextDestination = accounts.find((account) => account.id === nextDestinationId);
    if (nextSource && nextDestination && nextSource.currency === nextDestination.currency && !entry) setDestinationAmount(sourceAmount);
    updateQuote(nextSourceId, nextDestinationId);
    setDestinationConfirmed(false);
    updateTitleSuggestion(nextSourceId, nextDestinationId);
  }

  function updateDestination(nextDestinationId: string) {
    setDestinationAccountId(nextDestinationId);
    const nextSource = accounts.find((account) => account.id === sourceAccountId);
    const nextDestination = accounts.find((account) => account.id === nextDestinationId);
    if (nextSource && nextDestination && nextSource.currency === nextDestination.currency && !entry) setDestinationAmount(sourceAmount);
    updateQuote(sourceAccountId, nextDestinationId);
    setDestinationConfirmed(false);
    updateTitleSuggestion(sourceAccountId, nextDestinationId);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const payload = isConversion
        ? {
            operationDate,
            title,
            note,
            sourceAccountId,
            destinationAccountId,
            sourceAmount,
            destinationAmount,
            sourceCurrency: sourceAccount?.currency ?? text(initial.sourceCurrency),
            destinationCurrency: destinationAccount?.currency ?? text(initial.destinationCurrency),
            destinationConfirmed,
            quote,
            institution: institution || null,
            otherInstitutionName,
          }
        : {
            kind: isWithdrawal ? "withdrawal" : "transfer",
            operationDate,
            title,
            note,
            sourceAccountId,
            destinationAccountId,
            sourceAmount,
            destinationAmount: entry ? destinationAmount : sourceAmount,
            currency: sourceAccount?.currency ?? text(initial.currency),
          };
      const response = await fetch(
        entry ? `/api/pending-entries/${entry.id}` : existing ? `/api/transfers/${existing.id}` : isConversion ? "/api/conversions" : "/api/transfers",
        {
          method: entry || existing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok && response.status !== 202) {
        setError(body.error ? transferIssueLabel(body.error) !== body.error ? transferIssueLabel(body.error) : conversionIssueLabel(body.error) : "No se pudo guardar la operación.");
        return;
      }
      const registered = body.transfer ?? body.conversion ?? (response.status === 201 || (existing && response.ok) ? body : undefined);
      if (registered?.id) {
        if (existing) {
          setSaved(true);
          onSaved?.();
          router.refresh();
        } else {
          setRegisteredId(registered.id);
          setRegisteredKind(isConversion ? "conversion" : "transfer");
        }
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

  function calculate() {
    if (!sourceAccount || !sourceAmount || !quote) return;
    try {
      setDestinationAmount(calculateDestinationAmount(sourceAccount.currency, sourceAmount, quote));
      setDestinationConfirmed(false);
    } catch {
      setError("Ingresá una cotización y un importe válidos.");
    }
  }

  if (saved) return <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">Cambios guardados.</p>;

  if (registeredId) {
    const label = registeredKind === "conversion" ? isWithdrawal ? "Conversión y retiro registrada" : "Conversión registrada" : isWithdrawal ? "Retiro registrado" : "Transferencia registrada";
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-semibold">{label}</h2>
        <Link href={`/privado/${registeredKind === "conversion" ? "conversiones" : "transferencias"}/${registeredId}`} className="mt-4 inline-flex min-h-12 items-center font-semibold text-emerald-900 underline underline-offset-4">Ver operación</Link>
      </div>
    );
  }

  if (pendingId && !entry) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold">Falta completar la operación</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">{issues.map((issue) => <li key={issue}>{(isConversion ? conversionIssueLabel : transferIssueLabel)(issue)}</li>)}</ul>
        <Link href={`/privado/pendientes/${pendingId}`} className="mt-4 inline-flex min-h-12 items-center font-semibold text-amber-950 underline underline-offset-4">Completar entrada pendiente</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={submit}>
      {issues.length > 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2"><p className="font-semibold">Falta resolver:</p><ul className="mt-2 list-disc pl-5">{issues.map((issue) => <li key={issue}>{transferIssueLabel(issue)}</li>)}</ul></div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 sm:col-span-2">{error}</p>}
      <label className="text-sm font-medium">Fecha<input type="date" value={operationDate} onChange={(event) => setOperationDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>
      <p className="self-end rounded-xl bg-stone-100 px-4 py-3 text-sm">Tipo de operación: <strong>{operationLabel(kind)}</strong></p>
      <label className="text-sm font-medium sm:col-span-2">Título<input maxLength={120} value={title} onChange={(event) => { setTitleEdited(true); setTitle(event.target.value); }} className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>
      <label className="text-sm font-medium">Cuenta de origen<select value={sourceAccountId} onChange={(event) => updateSource(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"><option value="">Elegir cuenta</option>{accounts.filter((account) => account.archivedAt == null && (account.id !== destinationAccountId || account.id === sourceAccountId)).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
      <label className="text-sm font-medium">Cuenta de destino<select value={destinationAccountId} onChange={(event) => updateDestination(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"><option value="">Elegir cuenta</option>{destinationOptions.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
      <label className="text-sm font-medium">{isConversion || entry ? "Importe debitado" : "Importe"}<input inputMode="decimal" value={sourceAmount} onChange={(event) => { setSourceAmount(event.target.value); if (!entry && !isConversion) setDestinationAmount(event.target.value); if (isConversion) setDestinationConfirmed(false); }} className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>
      {(isConversion || entry) && <label className="text-sm font-medium">Importe acreditado<input inputMode="decimal" value={destinationAmount} onChange={(event) => { setDestinationAmount(event.target.value); if (isConversion) setDestinationConfirmed(false); }} className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>}
      {isConversion && <>
        <label className="text-sm font-medium">Institución (opcional)<select value={institution} onChange={(event) => setInstitution(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"><option value="">Sin indicar</option><option value="itau">Itaú</option><option value="prex">Prex</option><option value="other">Otra</option></select></label>
        {institution === "other" && <label className="text-sm font-medium">Nombre de la institución<input maxLength={120} value={otherInstitutionName} onChange={(event) => setOtherInstitutionName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>}
        <label className="text-sm font-medium">Cotización de referencia<input inputMode="decimal" value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="1 USD = 40,25 UYU" className="mt-2 min-h-12 w-full rounded-xl border px-4" /></label>
        <p className="self-end text-sm text-stone-600">Cotización de {quoteDirection}: {quoteDirection === "compra" ? "al cambiar dólares por pesos" : "al cambiar pesos por dólares"}.</p>
        <div className="sm:col-span-2"><Button type="button" variant="outline" onClick={calculate}>Calcular acreditación</Button><p className="mt-2 text-sm text-stone-600">La cotización es una ayuda editable. Confirmá el importe realmente acreditado.</p></div>
        <p className="sm:col-span-2 text-sm text-stone-600">Tipo de cambio efectivo: {effectiveRate ?? "—"}</p>
        <label className="flex items-center gap-3 rounded-xl bg-stone-100 p-4 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={destinationConfirmed} onChange={(event) => setDestinationConfirmed(event.target.checked)} className="size-5" />Confirmé el importe acreditado real</label>
      </>}
      <label className="text-sm font-medium sm:col-span-2">Nota (opcional)<textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
      <div className="flex flex-wrap items-start gap-3 sm:col-span-2"><Button disabled={pending}>{pending ? "Guardando…" : entry ? "Guardar y registrar" : `Registrar ${isConversion ? isWithdrawal ? "conversión y retiro" : "conversión" : isWithdrawal ? "retiro" : "transferencia"}`}</Button>
        {!entry && !existing && <SavePendingButton entryType={isConversion ? "conversion" : "own-transfer"} draft={isConversion ? { operationDate, title, note, sourceAccountId, destinationAccountId, sourceAmount, destinationAmount, sourceCurrency: sourceAccount?.currency, destinationCurrency: destinationAccount?.currency, destinationConfirmed, quote, institution: institution || null, otherInstitutionName } : { kind: isWithdrawal ? "withdrawal" : "transfer", operationDate, title, note, sourceAccountId, destinationAccountId, sourceAmount, destinationAmount: sourceAmount, currency: sourceAccount?.currency }} />}
      </div>
    </form>
  );
}
