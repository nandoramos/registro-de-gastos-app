// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavePendingButton } from "@/components/save-pending-button";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); push.mockReset(); });

it.each(["expense", "income", "own-transfer"] as const)("guarda un borrador de tipo %s y abre su revisión", async (entryType) => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "pending-1" }, { status: 202 }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<SavePendingButton entryType={entryType} draft={{ operationDate: "2026-10-28", title: "Borrador" }} />);
  await user.click(screen.getByRole("button", { name: "Guardar pendiente" }));
  expect(fetchMock).toHaveBeenCalledWith("/api/pending-entries", expect.objectContaining({ method: "POST", body: expect.stringContaining(`"entryType":"${entryType}"`) }));
  expect(push).toHaveBeenCalledWith("/privado/pendientes/pending-1");
});
