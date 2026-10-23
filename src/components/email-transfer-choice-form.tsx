"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import { Button } from "@/components/ui/button";

export function EmailTransferChoiceForm({
  entryId,
  accounts,
  categories,
}: {
  entryId: string;
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const [nature, setNature] = useState<"expense" | "own-transfer">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/pending-entries/${entryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nature, accountId, categoryId }),
    });
    if (response.ok) setSaved(true);
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
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border bg-white px-4"
          >
            <option value="">Elegir categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="sm:col-span-2">
        <Button>Guardar naturaleza</Button>
      </div>
    </form>
  );
}
