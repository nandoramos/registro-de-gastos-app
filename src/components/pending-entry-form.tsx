"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import { pendingIssueLabel } from "@/modules/pending-entries/domain";
import { Button } from "@/components/ui/button";
import { useCategorySelection } from "@/components/category-selection";

type Entry = {
  id: string;
  interpretation: Record<string, unknown>;
  issues: string[];
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function PendingEntryForm({
  entry,
  accounts,
  categories,
  categoriesReady = true,
  onCategoryRejected,
}: {
  entry: Entry;
  accounts: AccountView[];
  categories: CategoryView[];
  categoriesReady?: boolean;
  onCategoryRejected?: () => void;
}) {
  const initial = entry.interpretation;
  const [operationDate, setOperationDate] = useState(
    text(initial.operationDate),
  );
  const [operationTime, setOperationTime] = useState(
    text(initial.operationTime),
  );
  const [title, setTitle] = useState(text(initial.title));
  const [note, setNote] = useState(text(initial.note));
  const [amount, setAmount] = useState(text(initial.amount));
  const [accountId, setAccountId] = useState(text(initial.accountId));
  const [categoryId, setCategoryId] = useState(text(initial.categoryId));
  const [issues, setIssues] = useState(entry.issues);
  const [expenseId, setExpenseId] = useState<string>();
  const [pending, setPending] = useState(false);
  const account = accounts.find((item) => item.id === accountId);
  const selection = useCategorySelection(categories, categoryId, categoriesReady);
  const categoryBlocked = !categoriesReady || selection.invalid;
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (categoryBlocked) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await fetch("/api/pending-entries/" + entry.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationDate,
          operationTime,
          title,
          note,
          accountId,
          categoryId,
          amount,
          currency: account?.currency ?? text(initial.currency),
        }),
      });
      const body = await response.json();
      if (body.error === "CATEGORY_NOT_FOUND" || body.issues?.includes("CATEGORY_NOT_FOUND")) { selection.reject(); onCategoryRejected?.(); }
      if (!response.ok) throw new Error("SAVE_FAILED");
      if (body.status === "registered") setExpenseId(body.expense.id);
      else if (body.issues) setIssues(body.issues);
    } catch {
      setError("No pudimos guardar la entrada. Intentá nuevamente.");
    } finally {
      setPending(false);
    }
  }

  if (expenseId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-semibold">Gasto registrado</h2>
        <Link
          href={"/privado/gastos/" + expenseId}
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-emerald-900 underline"
        >
          Ver gasto registrado
        </Link>
      </div>
    );
  }

  return (
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2">
        <p className="font-semibold">Falta resolver:</p>
        <ul className="mt-2 list-disc pl-5">
          {issues.map((issue) => (
            <li key={issue}>{pendingIssueLabel(issue)}</li>
          ))}
        </ul>
      </div>
      <label className="text-sm font-medium">
        Fecha
        <input
          type="date"
          aria-label="Fecha"
          value={operationDate}
          onChange={(event) => setOperationDate(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Hora (opcional)
        <input
          type="time"
          value={operationTime}
          onChange={(event) => setOperationTime(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Título
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium">
        Cuenta de origen
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Categoría
        <select
          value={categoryId}
          disabled={!categoriesReady}
          onChange={(event) => { setCategoryId(event.target.value); selection.change(); setError(undefined); }}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir categoría</option>
          {selection.options.map((item) => (
            <option key={item.id} value={item.id} disabled={selection.disabled(item)}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Importe
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border px-4"
        />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Nota (opcional)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </label>
      {selection.invalid && <p role="alert">La categoría elegida ya no está disponible. Elegí otra categoría.</p>}
      {error && !selection.invalid && <p role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <Button disabled={pending || categoryBlocked}>
          {pending ? "Guardando…" : "Guardar y registrar"}
        </Button>
      </div>
    </form>
  );
}
