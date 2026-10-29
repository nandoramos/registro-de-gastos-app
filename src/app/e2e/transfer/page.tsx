import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TransferForm } from "@/components/transfer-form";
import { DEFAULT_QUOTE_SETTINGS } from "@/modules/settings/domain";

const syntheticAccounts = [
  { id: "e2e-itau-uyu", name: "Itaú pesos", kind: "bank" as const, currency: "UYU" as const, balance: "1000.00", openingBalance: "1000.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "e2e-billetera-uyu", name: "Billetera", kind: "cash" as const, currency: "UYU" as const, balance: "500.00", openingBalance: "500.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "e2e-prex-usd", name: "Prex dólares", kind: "bank" as const, currency: "USD" as const, balance: "100.00", openingBalance: "100.00", openingDate: "2026-01-01", archivedAt: null },
];

export const dynamic = "force-dynamic";

export default async function SyntheticTransferPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const session = (await cookies()).get("e2e_session")?.value;
  if (session !== "synthetic-transfer-user") notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-6 sm:px-10 sm:py-10">
      <p role="status" className="mb-4 text-xs text-stone-500">Sesión sintética de Playwright · datos ficticios</p>
      <h1 className="mb-6 text-3xl font-semibold">Transferencia / retiro</h1>
      <TransferForm accounts={syntheticAccounts} quoteSettings={DEFAULT_QUOTE_SETTINGS} />
    </main>
  );
}
