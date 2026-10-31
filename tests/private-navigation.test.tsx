// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivateNavigation } from "@/components/private-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/privado/cuentas" }));
vi.mock("@/components/auth-buttons", () => ({ SignOutButton: () => <button>Cerrar sesión</button> }));
afterEach(cleanup);

it("muestra el logo en escritorio y móvil y permite volver al inicio desde el menú", async () => {
  const user = userEvent.setup();
  render(<PrivateNavigation />);
  const desktop = screen.getByRole("navigation", { name: "Navegación principal" });
  const home = within(desktop).getByRole("link", { name: "Registro de Gastos" });
  expect(within(home).getByRole("img", { name: "Registro de Gastos" })).toBeTruthy();
  expect(home.getAttribute("href")).toBe("/privado");
  expect(within(screen.getByRole("banner")).getByRole("img", { name: "Registro de Gastos" })).toBeTruthy();

  const toggle = screen.getByRole("button", { name: "Abrir menú" });
  await user.click(toggle);
  const mobile = screen.getByRole("navigation", { name: "Menú móvil" });
  const mobileHome = within(mobile).getByRole("link", { name: "Registro de Gastos" });
  expect(within(mobileHome).getByRole("img", { name: "Registro de Gastos" })).toBeTruthy();
  await user.click(mobileHome);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
});

it("permite abrir el menú móvil y cerrarlo al elegir una pantalla existente", async () => {
  const user = userEvent.setup();
  render(<PrivateNavigation />);
  const button = screen.getByRole("button", { name: "Abrir menú" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  await user.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  const mobile = screen.getByRole("navigation", { name: "Menú móvil" });
  expect(within(mobile).getByRole("link", { name: "Cuentas" }).getAttribute("href")).toBe("/privado/cuentas");
  expect(within(mobile).getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  await user.click(within(mobile).getByRole("link", { name: "Cuentas" }));
  expect(button.getAttribute("aria-expanded")).toBe("false");
});

it("mantiene accesibles las pantallas existentes y distingue opciones futuras", () => {
  render(<PrivateNavigation />);
  const menu = screen.getByRole("navigation", { name: "Navegación principal" });
  expect(within(menu).getByRole("link", { name: "Movimientos" }).getAttribute("href")).toBe("/privado/historial");
  expect(within(menu).getByRole("link", { name: "Registrar gasto" }).getAttribute("href")).toBe("/privado/gastos/nuevo");
  expect(within(menu).getByRole("link", { name: "Registrar ingreso" }).getAttribute("href")).toBe("/privado/ingresos/nuevo");
  expect(within(menu).getByRole("link", { name: "Ingresar texto de email" })).toBeTruthy();
});

it("cierra el menú con Escape y devuelve el foco al botón", async () => {
  const user = userEvent.setup();
  render(<PrivateNavigation />);
  const button = screen.getByRole("button", { name: "Abrir menú" });
  await user.click(button);
  await user.keyboard("{Escape}");
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(button);
});
