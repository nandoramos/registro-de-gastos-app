"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  AccountCurrency,
  AccountKind,
  AccountView,
} from "@/modules/accounts/domain";
import { calculateEstimatedUsdTotal, DEFAULT_QUOTE_SETTINGS, type QuoteSettings } from "@/modules/settings/domain";
import { formatScaledInteger, parseBalanceCents } from "@/modules/money/decimal";
import { formatMoneyAmount } from "@/modules/money/format";

type ApiError = { error?: string };

function OpeningBalanceForm({ account, onSaved }: { account: AccountView; onSaved: (account: AccountView) => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(false);
    try {
      const response = await fetch(`/api/accounts/${account.id}/opening-balance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount, date }) });
      if (!response.ok) throw new Error();
      onSaved(await response.json());
    } catch { setError(true); } finally { setPending(false); }
  }
  return <form onSubmit={save} className="mt-4 grid gap-3">
    <p>Saldo inicial pendiente</p>
    <p>Ingresá el saldo que tenías al comienzo de la fecha elegida.</p>
    <label>Saldo inicial de {account.name}<input aria-label={`Saldo inicial de ${account.name}`} value={amount} onChange={(event) => setAmount(event.target.value)} required inputMode="decimal" /></label>
    <label>Fecha inicial de {account.name}<input aria-label={`Fecha inicial de ${account.name}`} type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
    <Button disabled={pending} aria-label={`Guardar saldo inicial de ${account.name}`}>Guardar saldo inicial</Button>
    {error && <p role="alert">No pudimos guardar el saldo inicial. Revisá el importe y la fecha.</p>}
  </form>;
}

function errorMessage(error?: string) {
  if (error === "INVALID_NAME")
    return "Ingresá un nombre de hasta 80 caracteres.";
  if (error === "INVALID_CURRENCY") return "Elegí pesos uruguayos o dólares.";
  if (error === "INVALID_KIND") return "Elegí cuenta bancaria o efectivo.";
  if (error === "INVALID_OPENING_BALANCE") return "Ingresá un saldo inicial válido, positivo o cero.";
  if (error === "INVALID_OPENING_DATE") return "Ingresá una fecha inicial válida.";
  return "No pudimos guardar el cambio. Intentá nuevamente.";
}

function sortAccountsForDisplay(accounts: AccountView[]) {
  const priority = ["itau pesos", "billetera", "itau dolares", "santander dolares", "prex dolares"];
  const normalizedName = (name: string) => name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-UY");
  return [...accounts].sort((a, b) => {
    const aPriority = priority.indexOf(normalizedName(a.name));
    const bPriority = priority.indexOf(normalizedName(b.name));
    if (aPriority >= 0 || bPriority >= 0) {
      if (aPriority < 0) return 1;
      if (bPriority < 0) return -1;
      if (aPriority !== bPriority) return aPriority - bPriority;
    }
    return a.name.localeCompare(b.name, "es-UY", { sensitivity: "base" });
  });
}

export function AccountsManager({
  initialAccounts,
  quoteSettings = DEFAULT_QUOTE_SETTINGS,
}: {
  initialAccounts: AccountView[];
  quoteSettings?: QuoteSettings;
}) {
  const [accounts, setAccounts] = useState(() => sortAccountsForDisplay(initialAccounts));
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [currency, setCurrency] = useState<AccountCurrency>("UYU");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingDate, setOpeningDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const balanceTotalCents = (currency: AccountCurrency) =>
    accounts.filter((account) => account.currency === currency && (account.balance ?? account.openingBalance) != null).reduce((sum, account) => {
      const value = account.balance ?? account.openingBalance!;
      return sum + parseBalanceCents(value);
    }, 0n);
  const decimalCents = (total: bigint) => formatScaledInteger(total, 2);
  const totalUyuCents = balanceTotalCents("UYU");
  const totalUsdCents = balanceTotalCents("USD");
  const totalIncomplete = accounts.length === 0 || accounts.some((account) => account.openingBalance == null);
  const totalUsdEstimate = totalIncomplete ? undefined : calculateEstimatedUsdTotal(
    decimalCents(totalUyuCents),
    decimalCents(totalUsdCents),
    quoteSettings.sellRate,
  );

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, kind, currency, openingBalance, openingDate }),
      });
      const body = (await response.json()) as AccountView & ApiError;
      if (!response.ok) throw new Error(body.error);
      setAccounts((current) =>
        sortAccountsForDisplay([...current, body]),
      );
      setName("");
      setOpeningBalance("");
    } catch (caught) {
      setError(
        errorMessage(caught instanceof Error ? caught.message : undefined),
      );
    } finally {
      setPending(false);
    }
  }

  async function rename(event: FormEvent, account: AccountView) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      const body = (await response.json()) as AccountView & ApiError;
      if (!response.ok) throw new Error(body.error);
      setAccounts((current) =>
        sortAccountsForDisplay(current.map((item) => (item.id === body.id ? { ...item, ...body } : item))),
      );
      setEditingId(undefined);
      setEditingName("");
    } catch (caught) {
      setError(
        errorMessage(caught instanceof Error ? caught.message : undefined),
      );
    } finally {
      setPending(false);
    }
  }
  async function archive(account: AccountView) {
    setPending(true); setError(undefined);
    try { const response = await fetch(`/api/accounts/${account.id}/archive`, { method: "POST" }); if (!response.ok) throw new Error(); const saved = await response.json() as AccountView; setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...saved } : item)); } catch { setError(errorMessage()); } finally { setPending(false); }
  }
  async function unarchive(account: AccountView) {
    setPending(true); setError(undefined);
    try { const response = await fetch(`/api/accounts/${account.id}/unarchive`, { method: "POST" }); if (!response.ok) throw new Error(); const saved = await response.json() as AccountView; setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...saved } : item)); } catch { setError(errorMessage()); } finally { setPending(false); }
  }

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="accounts-title">
          <h2 id="accounts-title" className="text-xl font-semibold">Tus cuentas</h2>
          {accounts.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">Todavía no agregaste cuentas.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {accounts.filter((account) => showArchived || !account.archivedAt).map((account) => (
                <li key={account.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  {editingId === account.id ? (
                    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => rename(event, account)}>
                      <label className="sr-only" htmlFor={`rename-${account.id}`}>Nuevo nombre</label>
                      <input id={`rename-${account.id}`} className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none" value={editingName} maxLength={80} required onChange={(event) => setEditingName(event.target.value)} />
                      <Button disabled={pending}>Guardar</Button>
                      <Button type="button" variant="outline" disabled={pending} onClick={() => setEditingId(undefined)}>Cancelar</Button>
                    </form>
                  ) : <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{account.name}</p>
                        <p className="mt-0.5 text-xs text-stone-600">{account.kind === "bank" ? "Cuenta bancaria" : "Efectivo"} · {account.currency}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {account.openingBalance != null && <p aria-label={`Saldo de ${account.name}`} className="whitespace-nowrap text-sm font-medium tabular-nums">Saldo: {formatMoneyAmount(account.currency, account.balance ?? account.openingBalance)}</p>}
                        <Link href={`/privado/historial?accountId=${encodeURIComponent(account.id)}&includeHouse=true`} aria-label={`Ver movimientos de ${account.name}`} title={`Ver movimientos de ${account.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                        </Link>
                      </div>
                    </div>
                    {account.openingBalance == null && <OpeningBalanceForm account={account} onSaved={(saved) => setAccounts((current) => sortAccountsForDisplay(current.map((item) => item.id === saved.id ? saved : item)))} />}
                    <div className="mt-2 flex justify-end gap-2">
                      <Button type="button" variant="outline" aria-label={`Renombrar ${account.name}`} title={`Renombrar ${account.name}`} onClick={() => { setEditingId(account.id); setEditingName(account.name); setError(undefined); }} className="h-9 w-9 min-h-9 p-0">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4 4 16.5Z" /><path d="m14.8 5.7 3.5 3.5" /></svg>
                      </Button>
                      {account.archivedAt ? <Button type="button" variant="outline" disabled={pending} aria-label={`Desarchivar ${account.name}`} title={`Desarchivar ${account.name}`} onClick={() => unarchive(account)} className="h-9 w-9 min-h-9 p-0"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5" /></svg></Button> : <Button type="button" variant="outline" disabled={pending} aria-label={`Archivar ${account.name}`} title={`Archivar ${account.name}`} onClick={() => archive(account)} className="h-9 w-9 min-h-9 p-0"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M3 7h18M5 7l1 13h12l1-13M9 7V4h6v3M10 11v5m4-5v5" /></svg></Button>}
                    </div>
                  </>}
                </li>
              ))}
            </ul>
          )}
          <label className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Mostrar archivadas</label>
        </section>

        <aside aria-labelledby="accounts-summary-title" className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 id="accounts-summary-title" className="text-lg font-semibold">Resumen de saldos</h2>
          {totalIncomplete && <p className="mt-3 text-sm text-amber-800">El total general está incompleto: hay cuentas sin saldo inicial.</p>}
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-stone-600">Total UYU:</dt><dd className="font-semibold tabular-nums">{formatMoneyAmount("UYU", decimalCents(totalUyuCents))}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-stone-600">Total USD:</dt><dd className="font-semibold tabular-nums">{formatMoneyAmount("USD", decimalCents(totalUsdCents))}</dd></div>
            <div className="border-t border-stone-200 pt-3"><div className="flex items-center justify-between gap-4"><dt className="font-medium">Total estimado en USD:</dt><dd className="text-base font-semibold tabular-nums">{totalUsdEstimate === undefined ? "Incompleto" : formatMoneyAmount("USD", totalUsdEstimate)}</dd></div><p className="mt-1 text-xs text-stone-500">Al tipo de venta: {quoteSettings.sellRate.replace(".", ",")} UYU/USD</p></div>
          </dl>
        </aside>
      </div>

      <section aria-labelledby="new-account-title" className="mt-8 max-w-3xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 id="new-account-title" className="text-xl font-semibold">
          Agregar cuenta
        </h2>
        {!accounts.some((account) => account.name.toLocaleLowerCase("es") === "billetera" && account.currency === "UYU" && account.kind === "cash") && <Button type="button" variant="outline" onClick={() => { setName("Billetera"); setKind("cash"); setCurrency("UYU"); setOpeningBalance(""); }}>Agregar Billetera</Button>}
        <form className="mt-6 space-y-5" onSubmit={create}>
          <p>Ingresá el saldo que tenías al comienzo de la fecha elegida.</p>
          <label className="block text-sm font-medium">
            Nombre
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
              value={name}
              maxLength={80}
              required
              placeholder="Ej. Itaú pesos"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Tipo
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
              value={kind}
              onChange={(event) => setKind(event.target.value as AccountKind)}
            >
              <option value="bank">Cuenta bancaria</option>
              <option value="cash">Efectivo</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Moneda
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as AccountCurrency)
              }
            >
              <option value="UYU">Pesos uruguayos (UYU)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Saldo inicial
            <input className="mt-2 min-h-12 w-full rounded-xl border px-4" inputMode="decimal" required value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">Fecha inicial
            <input className="mt-2 min-h-12 w-full rounded-xl border px-4" type="date" required value={openingDate} onChange={(event) => setOpeningDate(event.target.value)} />
          </label>
          <Button className="w-full" disabled={pending}>
            {pending ? "Guardando…" : "Agregar cuenta"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </section>
    </>
  );
}
