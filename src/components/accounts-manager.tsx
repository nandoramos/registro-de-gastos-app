"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AccountCurrency,
  AccountKind,
  AccountView,
} from "@/modules/accounts/domain";

type ApiError = { error?: string };

function errorMessage(error?: string) {
  if (error === "INVALID_NAME")
    return "Ingresá un nombre de hasta 80 caracteres.";
  if (error === "INVALID_CURRENCY") return "Elegí pesos uruguayos o dólares.";
  if (error === "INVALID_KIND") return "Elegí cuenta bancaria o efectivo.";
  return "No pudimos guardar el cambio. Intentá nuevamente.";
}

export function AccountsManager({
  initialAccounts,
}: {
  initialAccounts: AccountView[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [currency, setCurrency] = useState<AccountCurrency>("UYU");
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, kind, currency }),
      });
      const body = (await response.json()) as AccountView & ApiError;
      if (!response.ok) throw new Error(body.error);
      setAccounts((current) =>
        [...current, body].sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setName("");
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
          .map((item) => (item.id === body.id ? body : item))
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
    try { const response = await fetch(`/api/accounts/${account.id}/archive`, { method: "POST" }); if (!response.ok) throw new Error(); setAccounts((current) => current.filter((item) => item.id !== account.id)); } catch { setError(errorMessage()); } finally { setPending(false); }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="accounts-title">
        <h2 id="accounts-title" className="text-xl font-semibold">
          Tus cuentas
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Cada cuenta tiene una sola moneda. Los movimientos se agregarán en los
          próximos pasos.
        </p>
        {accounts.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
            Todavía no agregaste cuentas.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {accounts.map((account) => (
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
                    <Button variant="outline" disabled={pending} onClick={() => archive(account)}>Archivar</Button>
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
        <form className="mt-6 space-y-5" onSubmit={create}>
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
