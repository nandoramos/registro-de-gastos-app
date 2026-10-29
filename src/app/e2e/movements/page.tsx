import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MovementFilters, type MovementFilterValues } from "@/components/movement-filters";
import { MovementTable } from "@/components/movement-table";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { MovementHistoryItem, MovementType } from "@/modules/movements/history";
import type { PendingEntryView } from "@/modules/pending-entries/service";

export const dynamic = "force-dynamic";

const accounts: AccountView[] = [
  { id: "e2e-bank-uyu", name: "Itaú pesos", kind: "bank", currency: "UYU", balance: "9000.00", openingBalance: "10000.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "e2e-cash-uyu", name: "Billetera", kind: "cash", currency: "UYU", balance: "500.00", openingBalance: "500.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "e2e-bank-usd", name: "Prex dólares", kind: "bank", currency: "USD", balance: "100.00", openingBalance: "100.00", openingDate: "2026-01-01", archivedAt: null },
];
const categories: CategoryView[] = [{ id: "e2e-food", name: "Alimentación", systemKey: "food", archivedAt: null }];
const movements: MovementHistoryItem[] = [
  { id: "e2e-expense", type: "expense", date: "2026-10-28", operationTime: "12:35:00", title: "Almuerzo", note: "Comida de equipo con nota de ejemplo extensa para comprobar que se trunca en la fila y sigue disponible al editar.", voidedAt: null, createdAt: new Date("2026-10-28T15:35:00Z"), amount: "250.00", currency: "UYU", accountId: "e2e-bank-uyu", account: "Itaú pesos", categoryId: "e2e-food", category: "Alimentación" },
  { id: "e2e-conversion", type: "conversion", date: "2026-10-27", operationTime: null, title: "Conversión: Prex dólares → Billetera", note: null, voidedAt: null, createdAt: new Date("2026-10-27T15:00:00Z"), source: { accountId: "e2e-bank-usd", account: "Prex dólares", amount: "100.00", currency: "USD" }, destination: { accountId: "e2e-cash-uyu", account: "Billetera", amount: "4050.00", currency: "UYU" }, effectiveRate: "40.5", withdrawal: true, categoryId: null, category: null },
  { id: "e2e-voided", type: "income", date: "2026-10-26", operationTime: null, title: "Ingreso anulado", note: null, voidedAt: new Date("2026-10-27T10:00:00Z"), createdAt: new Date("2026-10-26T15:00:00Z"), amount: "1000.00", currency: "UYU", accountId: "e2e-bank-uyu", account: "Itaú pesos", categoryId: null, category: null },
];
const pendingEntries: PendingEntryView[] = [{ id: "e2e-pending", status: "pending", sourceType: "email", receivedAt: new Date("2026-10-25T15:00:00Z"), reviewedAt: null, interpretation: { entryType: "expense", operationDate: "2026-10-25", title: "Compra pendiente", note: "Falta confirmar categoría", amount: "45.00", currency: "UYU", accountId: "e2e-bank-uyu" }, issues: ["INVALID_CATEGORY"], original: {} }];
type SearchParams = Record<string, string | string[] | undefined>;
const values = (value: string | string[] | undefined) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const types: MovementType[] = ["expense", "income", "transfer", "withdrawal", "conversion", "adjustment"];

export default async function SyntheticMovementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const session = (await cookies()).get("e2e_session")?.value;
  if (session !== "synthetic-transfer-user") notFound();
  const raw = await searchParams;
  const selectedTypes = values(raw.type).filter((value): value is MovementType => types.includes(value as MovementType));
  const statusValue = one(raw.status);
  const status: MovementFilterValues["status"] = statusValue === "voided" || statusValue === "all" ? statusValue : "active";
  const search = one(raw.search)?.toLocaleLowerCase("es-UY");
  const filterValues: MovementFilterValues = { accountIds: values(raw.accountId), categoryIds: values(raw.categoryId), types: selectedTypes, currencies: values(raw.currency).filter((currency): currency is "UYU" | "USD" => currency === "UYU" || currency === "USD"), status, search };
  const filteredMovements = movements.filter((movement) => {
    if (status === "active" && movement.voidedAt || status === "voided" && !movement.voidedAt) return false;
    if (selectedTypes.length && !selectedTypes.some((type) => type === movement.type || type === "withdrawal" && movement.type === "conversion" && movement.withdrawal)) return false;
    return !search || `${movement.title} ${movement.note ?? ""}`.toLocaleLowerCase("es-UY").includes(search);
  });
  const filteredPending = status === "voided" || selectedTypes.length > 0 && !selectedTypes.includes("expense") ? [] : pendingEntries;

  return <main className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-10 sm:py-12">
    <p role="status" className="mb-4 text-xs text-stone-500">Sesión sintética de Playwright · datos ficticios</p>
    <h1 className="text-4xl font-semibold">Movimientos</h1>
    <MovementFilters accounts={accounts} categories={categories} values={filterValues} houseMode={false} summary={[]} />
    <p className="mt-6 text-xs text-stone-500">Los pendientes no afectan saldos ni totales.</p>
    <MovementTable movements={filteredMovements} pendingEntries={filteredPending} accounts={accounts} categories={categories} />
  </main>;
}
