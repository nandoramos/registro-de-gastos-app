// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { HomeOverview } from "@/components/home-overview";

afterEach(cleanup);

it("muestra gastos por moneda, el acceso a sus movimientos y los pendientes globales", () => {
  render(<HomeOverview
    greeting="Buen día, Totei"
    month="2026-10"
    expenses={[{ currency: "UYU", amount: "125.50" }, { currency: "USD", amount: "0.00" }]}
    pendingCount={3}
  />);

  expect(screen.getByRole("heading", { name: "Buen día, Totei" })).toBeTruthy();
  expect(screen.getByText("$125,50")).toBeTruthy();
  expect(screen.getByText("U$S 0,00")).toBeTruthy();
  const expensesLink = screen.getByRole("link", { name: "Ver movimientos que forman estos gastos" });
  expect(expensesLink.getAttribute("href")).toBe("/privado/historial?month=2026-10&type=expense&type=adjustment&spending=true");
  expect(screen.getByRole("link", { name: "Pendientes de revisión (3)" }).getAttribute("href")).toBe("/privado/pendientes");
  expect(screen.queryByText("Ingresos")).toBeNull();
  expect(screen.queryByText("Movimientos recientes")).toBeNull();
  expect(screen.queryByText("Por categoría")).toBeNull();
});
