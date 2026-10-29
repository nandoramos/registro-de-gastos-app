"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountView } from "@/modules/accounts/domain";
import type { AdjustmentInput } from "@/modules/adjustments/domain";
import { Button } from "@/components/ui/button";

type Adjustment = AdjustmentInput & { id: string };
export function AdjustmentEditForm({ adjustment, accounts, onSaved }: { adjustment: Adjustment; accounts: AccountView[]; onSaved?: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState({ accountId: adjustment.accountId, operationDate: adjustment.operationDate, direction: adjustment.direction, amount: adjustment.amount, title: adjustment.title, note: adjustment.note ?? "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); setSaved(false); try { const response = await fetch(`/api/adjustments/${adjustment.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error); setSaved(true); router.refresh(); onSaved?.(); } catch (caught) { const code = caught instanceof Error ? caught.message : ""; setError(code === "INVALID_DATE" ? "La fecha no puede ser futura." : "No se pudo guardar. Revisá que la fecha sea igual o posterior al inicio de la cuenta."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="mt-4 grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">Cuenta<select value={input.accountId} onChange={(e) => setInput({ ...input, accountId: e.target.value })} className="min-h-12 rounded-lg border px-3">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Fecha<input required type="date" value={input.operationDate} onChange={(e) => setInput({ ...input, operationDate: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Dirección<select value={input.direction} onChange={(e) => setInput({ ...input, direction: e.target.value as "increase" | "decrease" })} className="min-h-12 rounded-lg border px-3"><option value="decrease">Disminuye el saldo</option><option value="increase">Aumenta el saldo</option></select></label>
    <label className="grid gap-2 text-sm font-medium">Importe<input required inputMode="decimal" value={input.amount} onChange={(e) => setInput({ ...input, amount: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">Detalle<input required maxLength={120} value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">Nota opcional<textarea maxLength={1000} rows={3} value={input.note} onChange={(e) => setInput({ ...input, note: e.target.value })} className="rounded-lg border p-3" /></label>
    <div className="sm:col-span-2"><Button disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button>{saved && <p role="status" className="mt-3 text-sm text-emerald-800">Cambios guardados.</p>}{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}</div>
  </form>;
}
