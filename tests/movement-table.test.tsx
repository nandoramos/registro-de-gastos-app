// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovementTable } from "@/components/movement-table";
import type { MovementHistoryItem } from "@/modules/movements/history";
import type { PendingEntryView } from "@/modules/pending-entries/service";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); refresh.mockReset(); });
const accounts = [
  { id: "bank", name: "Itaú pesos", kind: "bank" as const, currency: "UYU" as const, balance: "9500.00", openingBalance: "10000.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "cash", name: "Billetera", kind: "cash" as const, currency: "UYU" as const, balance: "100.00", openingBalance: "100.00", openingDate: "2026-01-01", archivedAt: null },
];
const categories = [{ id: "food", name: "Alimentación", systemKey: "food" as const, archivedAt: null }];
const rows: MovementHistoryItem[] = [
  { id: "expense-1", type: "expense", date: "2026-10-28", operationTime: "12:35:00", title: "Almuerzo", note: "Comida con el equipo", voidedAt: null, createdAt: new Date("2026-10-28T12:35:00Z"), amount: "250.00", currency: "UYU", accountId: "bank", account: "Itaú pesos", categoryId: "food", category: "Alimentación" },
  { id: "transfer-1", type: "withdrawal", date: "2026-10-27", operationTime: null, title: "Retiro", note: null, voidedAt: null, createdAt: new Date("2026-10-27T15:00:00Z"), source: { accountId: "bank", account: "Itaú pesos", amount: "500.00", currency: "UYU" }, destination: { accountId: "cash", account: "Billetera", amount: "500.00", currency: "UYU" }, categoryId: null, category: null },
];
const expenseDetail = { id: "expense-1", voidedAt: null, operationDate: "2026-10-28", operationTime: "12:35:00", title: "Almuerzo", note: null, amount: "250.00", currency: "UYU", account: { id: "bank", name: "Itaú pesos", currency: "UYU" }, category: { id: "food", name: "Alimentación" }, source: { type: "manual", receivedAt: new Date(), original: {} }, history: [] };
const pendingRows: PendingEntryView[] = [{ id: "pending-1", status: "pending", sourceType: "email", receivedAt: new Date("2026-10-26T15:00:00Z"), reviewedAt: null, interpretation: { operationDate: "2026-10-26", title: "Compra por revisar", note: "Falta categoría", amount: "45", currency: "UYU" }, issues: ["INVALID_CATEGORY"], original: {} }];

describe("tabla de movimientos", () => {
  it("muestra fechas locales, notas, estado accesible y la moneda debajo de la cuenta", () => {
    const { container } = render(<MovementTable movements={rows} accounts={accounts} categories={categories} />);
    expect(screen.getByRole("columnheader", { name: "Fecha" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Moneda" })).toBeNull();
    expect(container.textContent).toContain("28/10/26");
    expect(container.textContent).toContain("12:35");
    expect(container.textContent).toContain("Comida con el equipo");
    expect(container.textContent).toContain("Almuerzo");
    expect(container.textContent).toContain("Ingresado");
    expect(container.textContent).toContain("Itaú pesos → Billetera");
    expect(container.textContent).toContain("$500,00 → $500,00");
    expect(container.textContent).toContain("Itaú pesos");
    expect(container.textContent).toContain("UYU");
    expect(screen.getByRole("columnheader", { name: "Estado" }).querySelector(".sr-only")).toBeTruthy();
  });

  it("incluye pendientes en la tabla sin presentarlos como movimientos ingresados", () => {
    const incomplete = { ...pendingRows[0]!, id: "pending-incomplete", interpretation: { title: "Pendiente incompleto", amount: "sin importe", currency: "EUR" } };
    render(<MovementTable movements={[]} pendingEntries={[...pendingRows, incomplete]} accounts={accounts} categories={categories} />);
    expect(screen.getByRole("table", { name: "Movimientos" })).toBeTruthy();
    expect(screen.getByText("Compra por revisar")).toBeTruthy();
    expect(screen.getAllByText(/Gasto · Pendiente/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Editar Compra por revisar" }).getAttribute("href")).toBe("/privado/pendientes/pending-1");
    expect(screen.getByRole("table", { name: "Movimientos" }).textContent).not.toContain("NaN");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("abre el lápiz en un popup de edición y permite cancelar sin enviar cambios", async () => {
    const confirm = vi.fn().mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue(Response.json(expenseDetail)); vi.stubGlobal("confirm", confirm); vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup(); render(<MovementTable movements={rows.slice(0, 1)} accounts={accounts} categories={categories} />);
    await user.click(screen.getByRole("button", { name: "Editar Almuerzo" }));
    expect(await screen.findByRole("dialog", { name: "Editar movimiento" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/expenses/expense-1");
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Cena");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Editar movimiento" })).toBeTruthy();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("confirma la anulación y deja el popup en modo de consulta y restauración", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(expenseDetail)).mockResolvedValueOnce(Response.json({ status: "voided", changed: true })); vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup(); render(<MovementTable movements={rows.slice(0, 1)} accounts={accounts} categories={categories} />);
    await user.click(screen.getByRole("button", { name: "Editar Almuerzo" }));
    await screen.findByRole("dialog", { name: "Editar movimiento" });
    await user.click(screen.getByRole("button", { name: "Anular movimiento" }));
    expect(await screen.findByText(/Este movimiento está anulado/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restaurar movimiento" })).toBeTruthy();
    expect(screen.queryByLabelText("Detalle")).toBeNull();
  });
});
