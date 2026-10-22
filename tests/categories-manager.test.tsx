// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoriesManager } from "@/components/categories-manager";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("gestión de categorías", () => {
  it("crea una categoría propia y la muestra sin recargar", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { id: "custom-category", name: "Mascotas", systemKey: null },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CategoriesManager initialCategories={[]} />);
    await user.type(screen.getByLabelText("Nombre"), "Mascotas");
    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    await screen.findByText("Mascotas");
    expect(screen.getByText("Personalizada")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Mascotas" }),
      }),
    );
  });

  it("renombra una categoría inicial sin ofrecer jerarquía ni borrado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "house-category",
        name: "Obra de casa",
        systemKey: "house_construction",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <CategoriesManager
        initialCategories={[
          {
            id: "house-category",
            name: "Casa Nueva",
            systemKey: "house_construction",
          },
        ]}
      />,
    );

    const categoryRow = within(screen.getByRole("listitem"));
    expect(categoryRow.queryByText(/subcategor/i)).toBeNull();
    expect(categoryRow.queryByRole("button", { name: /eliminar/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Renombrar" }));
    const input = screen.getByLabelText("Nuevo nombre");
    await user.clear(input);
    await user.type(input, "Obra de casa");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText("Obra de casa")).toBeTruthy());
    expect(screen.getByText("Inicial")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/house-category",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Obra de casa" }),
      }),
    );
  });

  it("explica que Otros requiere una elección explícita", () => {
    render(<CategoriesManager initialCategories={[]} />);

    expect(
      screen.getByText(/«Otros» queda disponible como elección explícita/i),
    ).toBeTruthy();
  });

  it("muestra el error de validación y permite corregir", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "INVALID_NAME" }, { status: 422 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CategoriesManager initialCategories={[]} />);
    await user.type(screen.getByLabelText("Nombre"), "Categoría");
    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ingresá un nombre de hasta 80 caracteres.",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Agregar categoría",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
