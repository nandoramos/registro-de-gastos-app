"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PendingManualDeleteButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function remove() {
    if (!window.confirm("¿Borrar definitivamente este pendiente manual? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/pending-entries/${entryId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      router.push("/privado/pendientes");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return <div>
    <Button type="button" variant="outline" disabled={busy} onClick={remove}>{busy ? "Borrando…" : "Borrar pendiente"}</Button>
    {error && <p role="alert" className="mt-2 text-sm text-red-800">No se pudo borrar el pendiente.</p>}
  </div>;
}
