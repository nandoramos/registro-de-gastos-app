// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingManualDeleteButton } from "@/components/pending-manual-delete-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); push.mockReset(); });

it("pide confirmación antes de borrar y conserva el pendiente si se cancela", async () => {
  const confirm = vi.fn().mockReturnValue(false);
  const fetchMock = vi.fn();
  vi.stubGlobal("confirm", confirm); vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<PendingManualDeleteButton entryId="pending-1" />);
  await user.click(screen.getByRole("button", { name: "Borrar pendiente" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(fetchMock).not.toHaveBeenCalled();
});
