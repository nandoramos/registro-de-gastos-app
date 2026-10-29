// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseEditForm } from "@/components/expense-edit-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const accounts = [
  {
    id: "account-uyu",
    name: "Cuenta pesos",
    kind: "bank" as const,
    currency: "UYU" as const,
  },
];
const categories = [
  { id: "food", name: "Alimentación", systemKey: "food" as const },
  { id: "health", name: "Salud", systemKey: "health" as const },
];
const expense = {
  id: "expense-1",
  operationDate: "2026-10-18",
  operationTime: "14:35:00",
  title: "Compra inicial",
  note: null,
  amount: "42.50",
  currency: "UYU" as const,
  account: {
    id: "account-uyu",
    name: "Cuenta pesos",
    currency: "UYU" as const,
  },
  category: { id: "food", name: "Alimentación" },
};

describe("edición de gastos", () => {
  it("conserva una categoría archivada confirmada pero bloquea otra que se archive mientras se edita", async () => {
    const user = userEvent.setup();
    const originalArchived = [{ ...categories[0], archivedAt: new Date() }, categories[1]];
    const view = render(<ExpenseEditForm expense={expense} accounts={accounts} categories={originalArchived} />);
    expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(false);
    await user.selectOptions(screen.getByLabelText("Categoría"), "health");
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Borrador de edición");
    view.rerender(<ExpenseEditForm expense={expense} accounts={accounts} categories={originalArchived.map(category => ({ ...category, archivedAt: new Date() }))} />);
    expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Borrador de edición");
    await user.selectOptions(screen.getByLabelText("Categoría"), "food");
    expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("advierte si la corrección dejará saldo negativo", async () => {
    const user = userEvent.setup();
    render(<ExpenseEditForm expense={expense} accounts={[{ ...accounts[0], balance: "10.00" }]} categories={categories} />);
    const amount = screen.getByLabelText("Importe");
    await user.clear(amount);
    await user.type(amount, "60");
    expect(screen.getByText(/saldo negativo/i)).toBeTruthy();
  });
  it("envía la corrección y confirma que quedó guardada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        ...expense,
        title: "Compra corregida",
        category: { id: "health", name: "Salud" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <ExpenseEditForm
        expense={expense}
        accounts={accounts}
        categories={categories}
      />,
    );
    const title = screen.getByLabelText("Título");
    await user.clear(title);
    await user.type(title, "Compra corregida");
    await user.selectOptions(screen.getByLabelText("Categoría"), "health");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      (await screen.findByText(/Cambios guardados/)).textContent,
    ).toContain("Cambios guardados");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/expenses/expense-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          operationDate: "2026-10-18",
          operationTime: "14:35",
          title: "Compra corregida",
          note: "",
          accountId: "account-uyu",
          categoryId: "health",
          amount: "42.50",
          currency: "UYU",
        }),
      }),
    );
    await user.click(screen.getByRole("button", { name: "Actualizar detalle e historial" }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("explica una corrección inválida y conserva lo escrito", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "INVALID_AMOUNT" }, { status: 422 }),
        ),
    );
    const user = userEvent.setup();

    render(
      <ExpenseEditForm
        expense={expense}
        accounts={accounts}
        categories={categories}
      />,
    );
    const amount = screen.getByLabelText("Importe");
    await user.clear(amount);
    await user.type(amount, "-1");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "importe positivo",
    );
    expect((amount as HTMLInputElement).value).toBe("-1");
  });
});
