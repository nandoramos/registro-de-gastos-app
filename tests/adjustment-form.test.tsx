// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdjustmentForm } from "@/components/adjustment-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); push.mockReset(); });
const accounts = [{ id: "itau", name: "Itaú pesos", kind: "bank" as const, currency: "UYU" as const, balance: "9500.00", openingBalance: "9500.00", openingDate: "2026-01-01", archivedAt: null }];

describe("formulario de ajuste manual", () => {
  it("no preselecciona cuenta y calcula la diferencia antes de guardar", async () => {
    render(<AdjustmentForm accounts={accounts} />);
    expect((screen.getByLabelText("Cuenta") as HTMLSelectElement).value).toBe("");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Cuenta"), "itau");
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("UYU 9500.00") === true)).toBeTruthy();
    await user.type(screen.getByLabelText("Saldo que muestra el banco o efectivo"), "9000");
    expect(screen.getByText(/−UYU 500.00/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Registrar ajuste" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("explica que un saldo igual no genera un movimiento", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup(); render(<AdjustmentForm accounts={accounts} />);
    await user.selectOptions(screen.getByLabelText("Cuenta"), "itau");
    await user.type(screen.getByLabelText("Saldo que muestra el banco o efectivo"), "9500");
    expect(screen.getByText(/No hay diferencia/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Registrar ajuste" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
