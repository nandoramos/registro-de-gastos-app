// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseForm } from "@/components/expense-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  {
    id: "account-uyu",
    name: "Cuenta pesos",
    kind: "bank" as const,
    currency: "UYU" as const,
  },
  {
    id: "account-usd",
    name: "Efectivo dólares",
    kind: "cash" as const,
    currency: "USD" as const,
  },
];
const categories = [
  { id: "food", name: "Alimentación", systemKey: "food" as const },
];

describe("formulario de gasto manual", () => {
  it("envía datos estructurados como texto decimal y muestra el acceso al registro", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          id: "expense-1",
          operationDate: "2026-10-18",
          operationTime: "14:35:00",
          title: "Mercado sintético",
          note: "Compra ficticia",
          amount: "42.50",
          currency: "USD",
          account: {
            id: "account-usd",
            name: "Efectivo dólares",
            currency: "USD",
          },
          category: { id: "food", name: "Alimentación" },
          source: {
            type: "manual",
            receivedAt: "2026-10-22T12:00:00.000Z",
            original: {},
          },
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ExpenseForm accounts={accounts} categories={categories} />);
    await user.type(screen.getByLabelText("Fecha"), "2026-10-18");
    await user.type(screen.getByLabelText("Hora (opcional)"), "14:35");
    await user.type(screen.getByLabelText("Título"), "Mercado sintético");
    await user.type(
      screen.getByLabelText("Nota (opcional)"),
      "Compra ficticia",
    );
    await user.selectOptions(
      screen.getByLabelText("Cuenta de origen"),
      "account-usd",
    );
    await user.selectOptions(screen.getByLabelText("Categoría"), "food");
    await user.type(screen.getByLabelText("Importe"), "42.50");

    expect(screen.getByText("USD", { selector: "output" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Registrar gasto" }));

    const detailLink = await screen.findByRole("link", {
      name: "Ver detalle y evidencia",
    });
    expect(detailLink.getAttribute("href")).toBe("/privado/gastos/expense-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/expenses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operationDate: "2026-10-18",
          operationTime: "14:35",
          title: "Mercado sintético",
          note: "Compra ficticia",
          accountId: "account-usd",
          categoryId: "food",
          amount: "42.50",
          currency: "USD",
        }),
      }),
    );
  });

  it("muestra una validación del servidor sin perder el formulario", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "CURRENCY_MISMATCH" }, { status: 422 }),
        ),
    );
    const user = userEvent.setup();

    render(<ExpenseForm accounts={accounts} categories={categories} />);
    await user.type(screen.getByLabelText("Fecha"), "2026-10-18");
    await user.type(screen.getByLabelText("Título"), "Compra sintética");
    await user.type(screen.getByLabelText("Importe"), "10");
    await user.click(screen.getByRole("button", { name: "Registrar gasto" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La moneda debe coincidir con la cuenta",
    );
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
      "Compra sintética",
    );
  });
});
