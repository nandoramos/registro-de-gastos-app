"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import { Button } from "@/components/ui/button";
import { useCategorySelection } from "@/components/category-selection";

export function EmailTransferChoiceForm({
  entryId,
  accounts,
  categories,
  categoriesReady = true,
  onCategoryRejected,
}: {
  entryId: string;
  accounts: AccountView[];
  categories: CategoryView[];
  categoriesReady?: boolean;
  onCategoryRejected?: () => void;
}) {
  const [nature, setNature] = useState<"expense" | "own-transfer">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const selection = useCategorySelection(categories, categoryId, categoriesReady);
  const categoryBlocked = nature === "expense" && (!categoriesReady || selection.invalid);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (categoryBlocked) return;
    setError(undefined);
    setPending(true);
    try {
    const response = await fetch(`/api/pending-entries/${entryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nature, accountId, categoryId }),
    });
    const body = await response.json();
    if (body.error === "CATEGORY_NOT_FOUND" || body.issues?.includes("CATEGORY_NOT_FOUND")) { selection.reject(); onCategoryRejected?.(); }
    if (!response.ok) throw new Error("SAVE_FAILED");
    setSaved(true);
    } catch { setError("No pudimos guardar la entrada. Intentá nuevamente."); }
    finally { setPending(false); }
  }

  if (saved) {
    return (
      <div className="rounded-xl bg-emerald-50 p-5">
        <p className="font-semibold">Naturaleza guardada</p>
        <Link
          className="mt-3 inline-flex font-semibold underline"
          href={`/privado/pendientes/${entryId}`}
        >
          Continuar completando la entrada
        </Link>
      </div>
    );
  }
  return (
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
      <label className="text-sm font-medium sm:col-span-2">
        ¿Qué representa la transferencia?
        <select
          value={nature}
          onChange={(event) => setNature(event.target.value as typeof nature)}
          className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
        >
          <option value="expense">Pago de un gasto</option>
          <option value="own-transfer">Traslado entre cuentas propias</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Cuenta de origen
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
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
      {nature === "expense" && (
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
      {nature === "expense" && selection.invalid && <p role="alert">La categoría elegida ya no está disponible. Elegí otra categoría.</p>}
      {error && !selection.invalid && <p role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <Button disabled={pending || categoryBlocked}>Guardar naturaleza</Button>
      </div>
    </form>
  );
}
