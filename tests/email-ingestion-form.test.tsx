// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailIngestionForm } from "@/components/email-ingestion-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  { id: "uyu", name: "Pesos", kind: "bank" as const, currency: "UYU" as const },
];
const categories = [
  { id: "food", name: "Alimentación", systemKey: "food" as const },
];

it("envía una compra interpretada con la selección manual y enlaza el gasto", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "expense-1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<EmailIngestionForm accounts={accounts} categories={categories} />);
  const text = `ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Comercio: Mercado Ejemplo
Importe debitado: UYU 100,00`;
  await user.type(screen.getByLabelText("Texto del email"), text);
  await user.selectOptions(screen.getByLabelText("Cuenta de origen"), "uyu");
  await user.selectOptions(screen.getByLabelText("Categoría"), "food");
  await user.click(
    screen.getByRole("button", { name: "Ingresar al registro" }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/email-entries",
    expect.objectContaining({
      body: JSON.stringify({
        text,
        accountId: "uyu",
        categoryId: "food",
        nature: "expense",
      }),
    }),
  );
  expect(
    (await screen.findByRole("link", { name: "Ver gasto" })).getAttribute(
      "href",
    ),
  ).toBe("/privado/gastos/expense-1");
});
