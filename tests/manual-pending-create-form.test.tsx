// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualPendingCreateForm } from "@/components/manual-pending-create-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); push.mockReset(); });

it("crea un pendiente manual del tipo elegido y abre su edición", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "pending-1" }, { status: 202 }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<ManualPendingCreateForm />);
  await user.selectOptions(screen.getByLabelText("Tipo de pendiente"), "income");
  await user.click(screen.getByRole("button", { name: "Crear pendiente" }));
  expect(fetchMock).toHaveBeenCalledWith("/api/pending-entries", expect.objectContaining({ method: "POST", body: expect.stringContaining('"entryType":"income"') }));
  expect(push).toHaveBeenCalledWith("/privado/pendientes/pending-1");
});
