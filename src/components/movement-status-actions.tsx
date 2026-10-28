"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function MovementStatusActions({ type, id, voided }: { type: "expense" | "transfer" | "conversion"; id: string; voided: boolean }) {
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const action = voided ? "restore" : "void";
  async function change() { setBusy(true); setError(""); try { const response = await fetch(`/api/movements/${type}/${id}/${action}`, { method: "POST" }); if (!response.ok) { const body = await response.json(); throw new Error(body.error); } setDone(true); } catch (caught) { setError(caught instanceof Error && caught.message === "ACCOUNT_NOT_CONFIGURED" ? "Configurá el saldo inicial de las cuentas y comprobá que la fecha del movimiento no sea anterior." : caught instanceof Error && caught.message === "INVALID_DATE" ? "No se puede restaurar un movimiento con fecha futura." : "No pudimos guardar el cambio. Intentá nuevamente."); } finally { setBusy(false); } }
  if (done) return <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{voided ? "Movimiento restaurado." : "Movimiento anulado."} Actualizá la página para ver el estado.</p>;
  return <div><Button type="button" variant="outline" disabled={busy} onClick={change}>{busy ? "Guardando…" : voided ? "Restaurar movimiento" : "Anular movimiento"}</Button>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}</div>;
}
