import { describe, expect, it } from "vitest";
import { suggestAccountFromCurrency } from "@/modules/email-import/account-assignment";

const accounts = [
  {
    id: "uyu-a",
    name: "Pesos A",
    kind: "bank" as const,
    currency: "UYU" as const,
  },
  {
    id: "usd",
    name: "Dólares",
    kind: "bank" as const,
    currency: "USD" as const,
  },
];

describe("asignación de cuenta desde evidencia verificada", () => {
  it("asigna la única cuenta propia con la moneda explícita", () => {
    expect(suggestAccountFromCurrency(accounts, "USD")).toEqual({
      status: "assigned",
      account: accounts[1],
    });
  });

  it("exige selección manual con varias candidatas", () => {
    expect(
      suggestAccountFromCurrency(
        [...accounts, { ...accounts[0], id: "uyu-b", name: "Pesos B" }],
        "UYU",
      ),
    ).toEqual({ status: "manual", reason: "MULTIPLE_CANDIDATES" });
  });

  it("no asigna sin moneda explícita ni sin coincidencias", () => {
    expect(suggestAccountFromCurrency(accounts, undefined)).toEqual({
      status: "manual",
      reason: "MISSING_CURRENCY",
    });
    expect(suggestAccountFromCurrency(accounts.slice(0, 1), "USD")).toEqual({
      status: "manual",
      reason: "NO_CANDIDATE",
    });
  });
});
