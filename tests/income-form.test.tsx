// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IncomeForm } from "@/components/income-form";
import { IncomeEditForm } from "@/components/income-edit-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  { id: "itau-uyu", name: "Itaú pesos", kind: "bank" as const, currency: "UYU" as const, balance: "1000.00", openingBalance: "1000.00", openingDate: "2026-01-01", archivedAt: null },
  { id: "prex-usd", name: "Prex dólares", kind: "bank" as const, currency: "USD" as const, balance: "50.00", openingBalance: "50.00", openingDate: "2026-01-01", archivedAt: null },
];

const income = {
  id: "income-1",
  operationDate: "2026-10-20",
  operationTime: "09:30:00",
  title: "Sueldo",
  note: null,
  amount: "500.00",
  currency: "UYU" as const,
  accountId: "itau-uyu",
  account: { id: "itau-uyu", name: "Itaú pesos", currency: "UYU" as const },
  voidedAt: null,
  source: { type: "manual" as const, receivedAt: new Date(), original: {} },
};

describe("formulario de ingresos", () => {
  it("sugiere Sueldo y fecha y hora actuales, permite editar el detalle y registra el ingreso", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...income, id: "saved-income", amount: "900.25" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<IncomeForm accounts={accounts} />);
    expect((screen.getByLabelText("Detalle") as HTMLInputElement).value).toBe("Sueldo");
    expect((screen.getByLabelText("Fecha") as HTMLInputElement).value).not.toBe("");
    expect((screen.getByLabelText("Hora (opcional)") as HTMLInputElement).value).not.toBe("");
    expect(screen.getByRole("button", { name: "Guardar pendiente" })).toBeTruthy();
    await user.clear(screen.getByLabelText("Detalle"));
    await user.type(screen.getByLabelText("Detalle"), "Honorarios");
    await user.type(screen.getByLabelText("Importe"), "900,25");
    await user.type(screen.getByLabelText("Nota (opcional)"), "Trabajo independiente");
    await user.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/incomes", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"title":"Honorarios"'),
    }));
    expect(await screen.findByRole("link", { name: "Ver ingreso" })).toBeTruthy();
    expect(screen.getByText("$900,25")).toBeTruthy();
    expect((screen.getByLabelText("Detalle") as HTMLInputElement).value).toBe("Sueldo");
    expect((screen.getByLabelText("Importe") as HTMLInputElement).value).toBe("");
  });

  it("advierte si editar el ingreso dejaría el saldo negativo", async () => {
    const user = userEvent.setup();
    render(<IncomeEditForm income={income} accounts={[{ ...accounts[0], balance: "-100.00" }]} />);
    await user.clear(screen.getByLabelText("Importe"));
    await user.type(screen.getByLabelText("Importe"), "50");
    expect(screen.getByText(/saldo negativo/i)).toBeTruthy();
  });
});
