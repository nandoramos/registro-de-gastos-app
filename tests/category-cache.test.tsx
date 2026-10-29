// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CategoryCacheProvider } from "@/components/category-cache";
import { CachedExpenseForm } from "@/components/cached-category-views";
import { CachedCategoriesManager } from "@/components/cached-category-views";
import { SignOutButton } from "@/components/auth-buttons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/modules/auth/client", () => ({
  authClient: { signOut: vi.fn(async () => ({})) },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const accounts = [
  {
    id: "synthetic-account",
    name: "Itaú pesos",
    currency: "UYU" as const,
    kind: "bank" as const,
  },
];
function response(userId: string, name: string) {
  return Response.json({
    userId,
    categories: [
      { id: `${userId}-category`, name, systemKey: null, archivedAt: null },
    ],
  });
}
function deferred() {
  let resolve!: (value: Response) => void;
  return {
    promise: new Promise<Response>((accept) => {
      resolve = accept;
    }),
    resolve: (value: Response) => resolve(value),
  };
}

it("descarta una respuesta posterior al cierre aunque el transporte ignore la cancelación", async () => {
  const late = deferred();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response("owner", "Categoría inicial"))
    .mockReturnValueOnce(late.promise);
  vi.stubGlobal("fetch", fetchMock);
  render(
    <CategoryCacheProvider>
      <SignOutButton />
      <CachedExpenseForm userId="owner" accounts={accounts} />
    </CategoryCacheProvider>,
  );
  await screen.findByRole("option", { name: "Categoría inicial" });
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(
    screen.queryByRole("option", { name: "Categoría inicial" }),
  ).toBeNull();
  await act(async () => {
    late.resolve(response("owner", "Categoría tardía"));
  });
  expect(screen.queryByRole("option", { name: "Categoría tardía" })).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Registrar gasto",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("separa usuarios y descarta una lectura del usuario anterior que llega tarde", async () => {
  const previous = deferred();
  const next = deferred();
  const fetchMock = vi
    .fn()
    .mockReturnValueOnce(previous.promise)
    .mockReturnValueOnce(next.promise);
  vi.stubGlobal("fetch", fetchMock);
  const view = render(
    <CategoryCacheProvider>
      <CachedExpenseForm userId="previous" accounts={accounts} />
    </CategoryCacheProvider>,
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await userEvent
    .setup()
    .type(screen.getByLabelText("Título"), "Borrador del usuario anterior");
  view.rerender(
    <CategoryCacheProvider>
      <CachedExpenseForm userId="next" accounts={accounts} />
    </CategoryCacheProvider>,
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await act(async () => {
    next.resolve(response("next", "Categoría del usuario actual"));
  });
  await screen.findByRole("option", { name: "Categoría del usuario actual" });
  await act(async () => {
    previous.resolve(response("previous", "Categoría ajena"));
  });
  expect(screen.queryByRole("option", { name: "Categoría ajena" })).toBeNull();
  expect(
    screen.getByRole("option", { name: "Categoría del usuario actual" }),
  ).toBeTruthy();
  expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("");
});

it("no muestra datos que el servidor identifica como pertenecientes a otra sesión", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response("other", "Categoría ajena")),
  );
  render(
    <CategoryCacheProvider>
      <CachedExpenseForm userId="owner" accounts={accounts} />
    </CategoryCacheProvider>,
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "No pudimos cargar",
  );
  expect(screen.queryByRole("option", { name: "Categoría ajena" })).toBeNull();
});

it("una actualización atrasada no sobrescribe una categoría creada mientras esperaba", async () => {
  const stale = deferred();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response("owner", "Categoría inicial"))
    .mockReturnValueOnce(stale.promise)
    .mockResolvedValueOnce(
      Response.json(
        {
          id: "new-category",
          name: "Categoría nueva",
          systemKey: null,
          archivedAt: null,
        },
        { status: 201, headers: { "X-Category-User": "owner" } },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <CategoryCacheProvider>
      <CachedCategoriesManager userId="owner" />
    </CategoryCacheProvider>,
  );
  await screen.findByText("Categoría inicial");
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nombre"), "Categoría nueva");
  await user.click(screen.getByRole("button", { name: "Agregar categoría" }));
  await screen.findByText("Categoría nueva");
  await act(async () => {
    stale.resolve(response("owner", "Categoría inicial"));
  });
  expect(screen.getByText("Categoría nueva")).toBeTruthy();
});

it("consulta una lista nueva tras un rechazo del servidor aunque hubiera una lectura anterior pendiente", async () => {
  const stale = deferred();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(response("owner", "Categoría inicial"))
    .mockReturnValueOnce(stale.promise)
    .mockResolvedValueOnce(
      Response.json({ error: "CATEGORY_NOT_FOUND" }, { status: 422 }),
    )
    .mockResolvedValueOnce(
      Response.json({
        userId: "owner",
        categories: [
          {
            id: "owner-category",
            name: "Categoría inicial",
            systemKey: null,
            archivedAt: "2026-10-29T00:00:00Z",
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <CategoryCacheProvider>
      <CachedExpenseForm userId="owner" accounts={accounts} />
    </CategoryCacheProvider>,
  );
  await screen.findByRole("option", { name: "Categoría inicial" });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Título"), "Borrador sintético");
  await user.type(screen.getByLabelText("Importe"), "12.34");
  await user.selectOptions(
    screen.getByLabelText("Categoría"),
    "owner-category",
  );
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await user.click(screen.getByRole("button", { name: "Registrar gasto" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  await act(async () => {
    stale.resolve(response("owner", "Categoría inicial"));
  });
  expect(
    (
      screen.getByRole("option", {
        name: "Categoría inicial",
      }) as HTMLOptionElement
    ).disabled,
  ).toBe(true);
  expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
    "Borrador sintético",
  );
});
