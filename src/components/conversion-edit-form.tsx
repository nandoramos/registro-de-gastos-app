"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountView } from "@/modules/accounts/domain";
import type { ConversionDetail } from "@/modules/conversions/domain";
import { calculateEffectiveRate } from "@/modules/conversions/domain";
import { Button } from "@/components/ui/button";

export function ConversionEditForm({ conversion, accounts, onSaved }: { conversion: ConversionDetail; accounts: AccountView[]; onSaved?: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState({ operationDate: conversion.operationDate, title: conversion.title, note: conversion.note ?? "", sourceAccountId: conversion.source.account.id, destinationAccountId: conversion.destination.account.id, sourceAmount: conversion.source.amount, destinationAmount: conversion.destination.amount, institutionKind: conversion.institution?.kind ?? "", institutionName: conversion.institution?.kind === "other" ? conversion.institution.name : "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const source = accounts.find((account) => account.id === input.sourceAccountId); const destination = accounts.find((account) => account.id === input.destinationAccountId);
  let rate: string | undefined;
  if (source && destination && source.currency !== destination.currency) { try { rate = calculateEffectiveRate(source.currency, input.sourceAmount, destination.currency, input.destinationAmount); } catch { rate = undefined; } }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); setSaved(false); try { const response = await fetch(`/api/conversions/${conversion.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error); setSaved(true); router.refresh(); onSaved?.(); } catch (caught) { const code = caught instanceof Error ? caught.message : ""; setError(code === "SAME_CURRENCY" ? "Elegí cuentas con monedas diferentes." : code === "ACCOUNT_NOT_AVAILABLE" ? "La cuenta debe estar configurada y su fecha inicial debe ser anterior o igual a la operación." : "Revisá los importes, las cuentas y la fecha."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">Fecha<input required type="date" value={input.operationDate} onChange={(e) => setInput({ ...input, operationDate: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Detalle<input required maxLength={120} value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Cuenta de origen<select value={input.sourceAccountId} onChange={(e) => setInput({ ...input, sourceAccountId: e.target.value })} className="min-h-12 rounded-lg border px-3">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Importe de origen<input required inputMode="decimal" value={input.sourceAmount} onChange={(e) => setInput({ ...input, sourceAmount: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <label className="grid gap-2 text-sm font-medium">Cuenta de destino<select value={input.destinationAccountId} onChange={(e) => setInput({ ...input, destinationAccountId: e.target.value })} className="min-h-12 rounded-lg border px-3">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">Importe de destino<input required inputMode="decimal" value={input.destinationAmount} onChange={(e) => setInput({ ...input, destinationAmount: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>
    <p className="sm:col-span-2 text-sm text-stone-600">Tipo de cambio efectivo: {rate ? `${rate.split(".")[0]},${rate.split(".")[1]?.slice(0, 2)} UYU por USD` : "—"}</p>
    <label className="grid gap-2 text-sm font-medium">Institución<select value={input.institutionKind} onChange={(e) => setInput({ ...input, institutionKind: e.target.value })} className="min-h-12 rounded-lg border px-3"><option value="">Sin indicar</option><option value="itau">Itaú</option><option value="prex">Prex</option><option value="other">Otra</option></select></label>
    {input.institutionKind === "other" && <label className="grid gap-2 text-sm font-medium">Nombre de la institución<input required maxLength={120} value={input.institutionName} onChange={(e) => setInput({ ...input, institutionName: e.target.value })} className="min-h-12 rounded-lg border px-3" /></label>}
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">Nota opcional<textarea maxLength={1000} rows={3} value={input.note} onChange={(e) => setInput({ ...input, note: e.target.value })} className="rounded-lg border p-3" /></label>
    <div className="sm:col-span-2"><Button disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button>{saved && <p role="status" className="mt-3 text-sm text-emerald-800">Cambios guardados.</p>}{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}</div>
  </form>;
}
