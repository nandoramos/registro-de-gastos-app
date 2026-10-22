import { describe, expect, it, vi } from "vitest";
import { authorizeSession, assertGoogleIdentity } from "@/modules/auth/access";

describe("identidad autorizada", () => {
  it("exige sub permitido y email verificado por Google", () => {
    expect(() =>
      assertGoogleIdentity(
        { sub: "google-owner", email_verified: true },
        "google-owner",
      ),
    ).not.toThrow();
    for (const profile of [
      { sub: "google-other", email_verified: true },
      { sub: "google-owner", email_verified: false },
      { sub: "google-owner" },
    ]) {
      expect(() => assertGoogleIdentity(profile, "google-owner")).toThrow();
    }
    expect(() =>
      assertGoogleIdentity({ sub: "", email_verified: true }, ""),
    ).toThrow();
  });
  it("rechaza acceso anónimo sin consultar datos privados", async () => {
    const ownsIdentity = vi.fn();
    expect(await authorizeSession(null, ownsIdentity)).toEqual({
      status: "unauthenticated",
    });
    expect(ownsIdentity).not.toHaveBeenCalled();
  });
  it("deriva la identidad de la sesión y revalida autorización", async () => {
    const ownsIdentity = vi.fn().mockResolvedValue(true);
    expect(
      await authorizeSession({ user: { id: "owner" } }, ownsIdentity),
    ).toEqual({ status: "authorized", userId: "owner" });
    expect(ownsIdentity).toHaveBeenCalledWith("owner");
    expect(
      await authorizeSession({ user: { id: "other" } }, async () => false),
    ).toEqual({ status: "forbidden" });
  });
});
