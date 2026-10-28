"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AccountCurrency,
  AccountKind,
  AccountView,
} from "@/modules/accounts/domain";

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

export function AccountsManager({
  initialAccounts,
}: {
  initialAccounts: AccountView[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
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
  const balanceTotals = (currency: AccountCurrency) => {
    const total = accounts.filter((account) => account.currency === currency && (account.balance ?? account.openingBalance) != null).reduce((sum, account) => {
      const value = account.balance ?? account.openingBalance!;
      const negative = value.startsWith("-");
      const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
      const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
      return sum + (negative ? -cents : cents);
    }, 0n);
    const absolute = total < 0n ? -total : total;
    return `${total < 0n ? "-" : ""}${absolute / 100n},${(absolute % 100n).toString().padStart(2, "0")}`;
  };

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
        [...current, body].sort((a, b) => a.name.localeCompare(b.name, "es")),
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
        current
          .map((item) => (item.id === body.id ? { ...item, ...body } : item))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="accounts-title">
        <h2 id="accounts-title" className="text-xl font-semibold">
          Tus cuentas
        </h2>
        <label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Mostrar archivadas</label>
        {accounts.some((account) => account.openingBalance == null) && <p>El total general está incompleto: hay cuentas sin saldo inicial.</p>}
        <p>Total UYU: {balanceTotals("UYU")}</p>
        <p>Total USD: {balanceTotals("USD")}</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Cada cuenta tiene una sola moneda. Configurá su saldo inicial para usarla en movimientos.
        </p>
        {accounts.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
            Todavía no agregaste cuentas.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {accounts.filter((account) => showArchived || !account.archivedAt).map((account) => (
              <li
                key={account.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                {editingId === account.id ? (
                  <form
                    className="flex flex-col gap-3 sm:flex-row"
                    onSubmit={(event) => rename(event, account)}
                  >
                    <label className="sr-only" htmlFor={`rename-${account.id}`}>
                      Nuevo nombre
                    </label>
                    <input
                      id={`rename-${account.id}`}
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
                      value={editingName}
                      maxLength={80}
                      required
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <Button disabled={pending}>Guardar</Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setEditingId(undefined)}
                    >
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {account.kind === "bank"
                          ? "Cuenta bancaria"
                          : "Efectivo"}{" "}
                        · {account.currency}
                      </p>
                      {account.openingBalance != null ? <p>Saldo: {account.currency} {(account.balance ?? account.openingBalance).replace(".", ",")}</p> : <OpeningBalanceForm account={account} onSaved={(saved) => setAccounts((current) => current.map((item) => item.id === saved.id ? saved : item))} />}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(account.id);
                        setEditingName(account.name);
                        setError(undefined);
                      }}
                    >
                      Renombrar
                    </Button>
                    {account.archivedAt ? <Button variant="outline" disabled={pending} onClick={() => unarchive(account)}>Desarchivar</Button> : <Button variant="outline" disabled={pending} onClick={() => archive(account)}>Archivar</Button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="new-account-title"
        className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
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
    </div>
  );
}
