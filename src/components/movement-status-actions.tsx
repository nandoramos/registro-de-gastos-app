"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function MovementStatusActions({ type, id, voided }: { type: "expense" | "transfer" | "conversion"; id: string; voided: boolean }) {
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState(false);
  const action = voided ? "restore" : "void";
  async function change() { setBusy(true); setError(false); try { const response = await fetch(`/api/movements/${type}/${id}/${action}`, { method: "POST" }); if (!response.ok) throw new Error(); setDone(true); } catch { setError(true); } finally { setBusy(false); } }
  if (done) return <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{voided ? "Movimiento restaurado." : "Movimiento anulado."} Actualizá la página para ver el estado.</p>;
  return <div><Button type="button" variant="outline" disabled={busy} onClick={change}>{busy ? "Guardando…" : voided ? "Restaurar movimiento" : "Anular movimiento"}</Button>{error && <p role="alert" className="mt-3 text-sm text-red-800">No pudimos guardar el cambio. Intentá nuevamente.</p>}</div>;
}
