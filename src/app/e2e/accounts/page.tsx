import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AccountsManager } from "@/components/accounts-manager";
import type { AccountView } from "@/modules/accounts/domain";

export const dynamic = "force-dynamic";

const accounts: AccountView[] = [
  { id: "e2e-itau-uyu", name: "Itaú pesos", kind: "bank", currency: "UYU", openingBalance: "4950.00", openingDate: "2026-01-01", balance: "9000.00", archivedAt: null },
  { id: "e2e-wallet", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "500.00", openingDate: "2026-01-01", balance: "4550.00", archivedAt: null },
  { id: "e2e-itau-usd", name: "Itaú dólares", kind: "bank", currency: "USD", openingBalance: "0.00", openingDate: "2026-01-01", balance: "10.00", archivedAt: null },
  { id: "e2e-santander", name: "Santander dólares", kind: "bank", currency: "USD", openingBalance: "20.00", openingDate: "2026-01-01", balance: "20.00", archivedAt: null },
  { id: "e2e-prex", name: "Prex dólares", kind: "bank", currency: "USD", openingBalance: "100.00", openingDate: "2026-01-01", balance: "0.00", archivedAt: null },
  { id: "e2e-zeta", name: "Zeta", kind: "bank", currency: "UYU", openingBalance: "1.00", openingDate: "2026-01-01", balance: "1.00", archivedAt: null },
  { id: "e2e-alfa", name: "Alfa", kind: "cash", currency: "UYU", openingBalance: "1.00", openingDate: "2026-01-01", balance: "1.00", archivedAt: null },
  { id: "e2e-archived", name: "Cuenta archivada", kind: "bank", currency: "UYU", openingBalance: "100.00", openingDate: "2026-01-01", balance: "100.00", archivedAt: new Date("2026-09-01T00:00:00Z") },
];

export default async function SyntheticAccountsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const session = (await cookies()).get("e2e_session")?.value;
  if (session !== "synthetic-transfer-user") notFound();
  return <main className="mx-auto min-h-dvh max-w-6xl px-5 py-8 sm:px-10 sm:py-10">
    <p role="status" className="mb-4 text-xs text-stone-500">Sesión sintética de Playwright · datos ficticios posteriores a una conversión</p>
    <h1 className="mb-6 text-3xl font-semibold">Cuentas</h1>
    <AccountsManager initialAccounts={accounts} quoteSettings={{ buyRate: "39.00", sellRate: "40.00" }} />
  </main>;
}
