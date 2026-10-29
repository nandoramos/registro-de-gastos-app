// @vitest-environment jsdom

import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovementFilters } from "@/components/movement-filters";

it("muestra un panel móvil que permite combinar varias cuentas, categorías y tipos", async () => {
  const user = userEvent.setup();
  render(<MovementFilters accounts={[{ id: "bank", name: "Itaú pesos", kind: "bank", currency: "UYU" }, { id: "cash", name: "Billetera", kind: "cash", currency: "UYU" }]} categories={[{ id: "food", name: "Alimentación", systemKey: "food" }, { id: "house", name: "Casa Nueva", systemKey: "house_construction" }]} values={{ month: "2026-10", accountIds: [], categoryIds: [], types: [], currencies: [], status: "active" }} houseMode={false} summary={[]} />);
  const toggle = screen.getByRole("button", { name: "Filtros" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  await user.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getAllByRole("checkbox", { name: "Itaú pesos · UYU" })).toHaveLength(1);
  expect(screen.getAllByRole("checkbox", { name: "Casa Nueva" })).toHaveLength(1);
  expect(screen.getAllByRole("checkbox", { name: "Gastos" })).toHaveLength(1);
  expect(screen.getByLabelText("Buscar en detalle y nota")).toBeTruthy();
  expect(screen.getByLabelText("Desde")).toBeTruthy();
  expect(screen.getByLabelText("Hasta")).toBeTruthy();
});
