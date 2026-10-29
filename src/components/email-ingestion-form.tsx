"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import {
  emailInterpretationIssueLabel,
  parseItauEmailText,
} from "@/modules/email-import/itau-parser";
import { Button } from "@/components/ui/button";
import { useCategorySelection } from "@/components/category-selection";
import { pendingIssueLabel } from "@/modules/pending-entries/domain";
import { suggestAccountFromCurrency } from "@/modules/email-import/account-assignment";

export function EmailIngestionForm({
  accounts,
  categories,
  categoriesReady = true,
  onCategoryRejected,
}: {
  accounts: AccountView[];
  categories: CategoryView[];
  categoriesReady?: boolean;
  onCategoryRejected?: () => void;
}) {
  const [text, setText] = useState("");
  const [manualAccountId, setManualAccountId] = useState<string>();
  const [categoryId, setCategoryId] = useState("");
  const [nature, setNature] = useState<"" | "expense" | "own-transfer">("");
  const [pending, setPending] = useState(false);
  const [expenseId, setExpenseId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [issues, setIssues] = useState<string[]>([]);
  const parsed = useMemo(() => parseItauEmailText(text), [text]);
  const accountSuggestion = useMemo(
    () => suggestAccountFromCurrency(accounts, parsed.fields.currency),
    [accounts, parsed.fields.currency],
  );
  const suggestedAccountId =
    accountSuggestion.status === "assigned" ? accountSuggestion.account.id : "";
  const accountId = manualAccountId ?? suggestedAccountId;
  const selectedNature = parsed.kind === "expense" ? "expense" : nature;
  const selection = useCategorySelection(categories, categoryId, categoriesReady);
  const categoryBlocked = selectedNature !== "own-transfer" && (!categoriesReady || selection.invalid);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (categoryBlocked) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await fetch("/api/email-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          accountId,
          categoryId,
          nature: selectedNature || undefined,
        }),
      });
      const body = await response.json();
      if (body.error === "CATEGORY_NOT_FOUND" || body.issues?.includes("CATEGORY_NOT_FOUND")) { selection.reject(); onCategoryRejected?.(); }
      if (!response.ok) throw new Error("SAVE_FAILED");
      if (response.status === 201 && body.id) setExpenseId(body.id);
      else if (body.id) {
        setPendingId(body.id);
        setIssues(body.issues ?? []);
      }
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
          className="mt-4 inline-flex font-semibold underline"
          href={`/privado/gastos/${expenseId}`}
        >
          Ver gasto
        </Link>
      </div>
    );
  }
  if (pendingId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold">Entrada pendiente</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {issues.map((issue) => (
            <li key={issue}>{pendingIssueLabel(issue)}</li>
          ))}
        </ul>
        <Link
          className="mt-4 inline-flex font-semibold underline"
          href={`/privado/pendientes/${pendingId}`}
        >
          Completar entrada
        </Link>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2"
      onSubmit={submit}
    >
      <label className="text-sm font-medium sm:col-span-2">
        Texto del email
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          maxLength={100000}
          className="mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm"
        />
      </label>
      {text && (
        <div className="rounded-xl bg-stone-100 p-4 text-sm sm:col-span-2">
          <strong>Detectado:</strong>{" "}
          {parsed.kind === "expense"
            ? "compra con débito"
            : parsed.kind === "bank-transfer"
              ? "transferencia"
              : "formato desconocido"}
          .
          {parsed.issues
            .filter((issue) => issue !== "FINANCIAL_NATURE_REQUIRED")
            .map((issue) => (
              <p key={issue} className="mt-1 text-amber-900">
                {emailInterpretationIssueLabel(issue)}
              </p>
            ))}
        </div>
      )}
      {parsed.kind === "bank-transfer" && (
        <label className="text-sm font-medium sm:col-span-2">
          ¿Qué representa la transferencia?
          <select
            value={nature}
            onChange={(event) => setNature(event.target.value as typeof nature)}
            className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
          >
            <option value="">Elegir naturaleza</option>
            <option value="expense">Pago de un gasto</option>
            <option value="own-transfer">Traslado entre cuentas propias</option>
          </select>
        </label>
      )}
      <label className="text-sm font-medium">
        Cuenta de origen
        <select
          aria-label="Cuenta de origen"
          value={accountId}
          onChange={(event) => setManualAccountId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="">Elegir cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
        {manualAccountId === undefined && suggestedAccountId && (
          <span className="mt-2 block text-xs text-emerald-800">
            Asignada automáticamente por coincidencia única de moneda. Podés
            corregirla.
          </span>
        )}
      </label>
      {selectedNature !== "own-transfer" && (
        <label className="text-sm font-medium">
          Categoría
          <select
            value={categoryId}
            disabled={!categoriesReady}
          onChange={(event) => { setCategoryId(event.target.value); selection.change(); setError(undefined); }}
            className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
          >
            <option value="">Elegir categoría</option>
            {selection.options.map((category) => (
              <option key={category.id} value={category.id} disabled={selection.disabled(category)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {selectedNature !== "own-transfer" && selection.invalid && <p role="alert">La categoría elegida ya no está disponible. Elegí otra categoría.</p>}
      {error && !selection.invalid && <p role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <Button
          disabled={
            pending || categoryBlocked ||
            !text.trim() ||
            (parsed.kind === "bank-transfer" && !nature)
          }
        >
          {pending ? "Ingresando…" : "Ingresar al registro"}
        </Button>
      </div>
    </form>
  );
}
