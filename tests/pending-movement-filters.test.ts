import { expect, it } from "vitest";
import type { PendingEntryView } from "@/modules/pending-entries/service";
import { filterPendingHistory } from "@/modules/movements/pending-history";

const entry = (id: string, interpretation: Record<string, unknown>): PendingEntryView => ({ id, status: "pending", sourceType: "manual", receivedAt: new Date(), reviewedAt: null, interpretation, issues: [], original: {} });
const entries = [
  entry("uncategorized", { entryType: "expense", title: "Revisar recibo" }),
  entry("house", { entryType: "expense", title: "Materiales", categoryId: "house", operationDate: "2026-10-12" }),
  entry("usual", { entryType: "expense", title: "Almuerzo", categoryId: "food", operationDate: "2026-10-12", accountId: "bank", currency: "UYU" }),
  entry("transfer-destination", { entryType: "own-transfer", kind: "transfer", title: "Transferencia", sourceAccountId: "bank", destinationAccountId: "cash", operationDate: "2026-10-13" }),
  entry("previous-month", { entryType: "expense", title: "Anterior", categoryId: "food", operationDate: "2026-09-30" }),
];

it("mantiene visibles los pendientes sin categoría y excluye Casa Nueva de la vista habitual", () => {
  expect(filterPendingHistory(entries, { houseMode: false, houseCategoryId: "house" }).map(({ id }) => id)).toEqual(["uncategorized", "usual", "transfer-destination", "previous-month"]);
});

it("muestra pendientes de Casa Nueva en su vista, respetando fecha, búsqueda y tipo", () => {
  expect(filterPendingHistory(entries, { houseMode: true, houseCategoryId: "house", endDate: "2026-10-31", search: "materiales", types: ["expense"] }).map(({ id }) => id)).toEqual(["house"]);
  expect(filterPendingHistory(entries, { houseMode: false, status: "voided" })).toEqual([]);
});

it("aplica el mes habitual y encuentra transferencias pendientes por cualquiera de sus cuentas", () => {
  expect(filterPendingHistory(entries, { houseMode: false, month: "2026-10", accountIds: ["cash"], types: ["transfer"] }).map(({ id }) => id)).toEqual(["transfer-destination"]);
});
