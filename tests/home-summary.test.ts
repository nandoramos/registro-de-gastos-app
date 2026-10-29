import { describe, expect, it } from "vitest";
import {
  completeHomeExpenseTotals,
  montevideoHour,
  montevideoMonth,
  greetingForHour,
} from "@/modules/summary/home";

describe("resumen de Inicio", () => {
  it("incluye ambas monedas aunque no tengan gastos", () => {
    expect(completeHomeExpenseTotals([{ currency: "UYU", amount: "125.50" }])).toEqual([
      { currency: "UYU", amount: "125.50" },
      { currency: "USD", amount: "0.00" },
    ]);
  });

  it("usa el mes y la hora de Montevideo", () => {
    const justAfterMidnightUtc = new Date("2026-10-01T02:00:00.000Z");
    expect(montevideoMonth(justAfterMidnightUtc)).toBe("2026-09");
    expect(montevideoHour(justAfterMidnightUtc)).toBe(23);
  });

  it.each([
    [8, "Buen día, Totei"],
    [15, "Buenas tardes, Totei"],
    [21, "Buenas noches, Totei"],
  ])("saluda según la hora %i", (hour, greeting) => {
    expect(greetingForHour(hour)).toBe(greeting);
  });
});
