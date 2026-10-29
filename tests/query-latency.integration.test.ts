import { afterAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { monthlySummary } from "@/modules/summary/service";
import { listMovementHistory } from "@/modules/movements/history";

const database = new PGlite();
const db = drizzle(database, { schema });
await migrate(db, { migrationsFolder: "drizzle" });
afterAll(() => database.close());

// Hold the external database responses, without timers or an implementation-
// specific scheduler. Independent reads must be requested before any returns.
for (const [name, run, expectedTables] of [
  [
    "resumen",
    () => monthlySummary(db, "synthetic-latency-user", "2026-10"),
    ["expense", "income", "manual_adjustment"],
  ],
  [
    "historial",
    () =>
      listMovementHistory(db, "synthetic-latency-user", { month: "2026-10" }),
    [
      "expense",
      "income",
      "own_transfer",
      "currency_conversion",
      "manual_adjustment",
    ],
  ],
] as const) {
  it(`${name}: solicita las lecturas independientes sin esperar respuestas anteriores`, async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const statements: string[] = [];
    const query = database.query.bind(database);
    const spy = vi
      .spyOn(database, "query")
      .mockImplementation(async (sql, params, options) => {
        statements.push(sql);
        await gate;
        return query(sql, params, options);
      });
    const result = run();
    try {
      // A task turn lets promise-based drivers start all independent requests.
      await new Promise<void>((resolve) => setImmediate(resolve));
      for (const table of expectedTables) {
        expect(
          statements.some((sql) => sql.includes(`from "${table}"`)),
          `Missing independent read: ${table}`,
        ).toBe(true);
      }
    } finally {
      release();
      await result;
      spy.mockRestore();
    }
  });
}
