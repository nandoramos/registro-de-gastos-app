import { describe, expect, it } from "vitest";
import { formatMoneyAmount } from "@/modules/money/format";

describe("formato visible de importes", () => {
  it("usa el símbolo de pesos, agrupación local y dos decimales", () => {
    expect(formatMoneyAmount("UYU", "34456.22")).toBe("$34.456,22");
  });

  it("usa la abreviatura acordada para dólares", () => {
    expect(formatMoneyAmount("USD", "2456.34")).toBe("U$S 2.456,34");
  });

  it("formatea cero y valores enteros sin perder los centésimos visibles", () => {
    expect(formatMoneyAmount("UYU", "0.00")).toBe("$0,00");
    expect(formatMoneyAmount("USD", "1234")).toBe("U$S 1.234,00");
  });

  it("conserva el signo de un saldo negativo", () => {
    expect(formatMoneyAmount("UYU", "-1234.56")).toBe("-$1.234,56");
  });

  it("rechaza importes inválidos o con más de dos decimales", () => {
    expect(() => formatMoneyAmount("UYU", "1.234,56")).toThrow();
    expect(() => formatMoneyAmount("USD", "10.001")).toThrow();
    expect(() => formatMoneyAmount("EUR", "10.00")).toThrow();
  });
});
