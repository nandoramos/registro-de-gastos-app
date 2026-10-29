"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SavePendingButton({ entryType, draft }: { entryType: "expense" | "income" | "own-transfer" | "conversion"; draft: Record<string, unknown> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function save() {
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/pending-entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manualPending: true, entryType, ...draft }) });
      const body = await response.json() as { id?: string };
      if (!response.ok || !body.id) throw new Error();
      router.push(`/privado/pendientes/${body.id}`);
      router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col items-start">
    <Button type="button" variant="outline" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar pendiente"}</Button>
    {error && <span role="alert" className="mt-2 text-sm text-red-800">No pudimos guardar el pendiente. Intentá nuevamente.</span>}
  </span>;
}
