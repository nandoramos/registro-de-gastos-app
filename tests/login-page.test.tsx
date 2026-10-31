// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Login from "@/app/login/page";

vi.mock("@/components/auth-buttons", () => ({
  SignInButton: () => <button>Continuar con Google</button>,
}));
afterEach(cleanup);

it("identifica la app con su logo y mantiene disponible el inicio de sesión", async () => {
  render(await Login({ searchParams: Promise.resolve({}) }));
  const header = screen.getByRole("banner");
  expect(within(header).getByRole("img", { name: "Registro de Gastos" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeTruthy();
});
