"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MovementType } from "@/modules/movements/status";
import { Button } from "@/components/ui/button";

export function MovementStatusActions({ type, id, voided }: { type: MovementType; id: string; voided: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [completedAction, setCompletedAction] = useState<"void" | "restore">();
  const [error, setError] = useState("");
  const action = voided ? "restore" : "void";
  async function change() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/movements/${type}/${id}/${action}`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      setCompletedAction(action);
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        code === "ACCOUNT_NOT_CONFIGURED"
          ? "Configurá el saldo inicial de las cuentas y comprobá que la fecha del movimiento no sea anterior."
          : code === "INVALID_DATE"
            ? "No se puede restaurar un movimiento con fecha futura."
            : "No pudimos guardar el cambio. Intentá nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (completedAction) {
    return (
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
        {completedAction === "restore" ? "Movimiento restaurado." : "Movimiento anulado."}
      </p>
    );
  }
  return (
    <div>
      <Button type="button" variant="outline" disabled={busy} onClick={change}>
        {busy ? "Guardando…" : voided ? "Restaurar movimiento" : "Anular movimiento"}
      </Button>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
