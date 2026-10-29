"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { currentExpenseDateTime } from "@/components/expense-fields";

const types = [
  ["expense", "Gasto"],
  ["income", "Ingreso"],
  ["own-transfer", "Transferencia o retiro"],
  ["conversion", "Conversión"],
] as const;

export function ManualPendingCreateForm() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<(typeof types)[number][0]>("expense");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pending-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manualPending: true, entryType, ...currentExpenseDateTime() }),
      });
      const body = await response.json() as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error);
      router.push(`/privado/pendientes/${body.id}`);
      router.refresh();
    } catch {
      setError("No pudimos crear el pendiente. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-8 rounded-2xl border border-stone-200 p-5">
    <h2 className="font-semibold">Nuevo pendiente manual</h2>
    <p className="mt-1 text-sm text-stone-600">Elegí el tipo. No afecta saldos ni totales hasta que lo registres.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <select aria-label="Tipo de pendiente" value={entryType} onChange={(event) => setEntryType(event.target.value as typeof entryType)} className="min-h-12 rounded-xl border px-3">
        {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <Button type="button" disabled={busy} onClick={create}>{busy ? "Creando…" : "Crear pendiente"}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
