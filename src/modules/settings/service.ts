import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { DEFAULT_QUOTE_SETTINGS, type QuoteSettings } from "./domain";

export async function getQuoteSettings<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
): Promise<QuoteSettings> {
  const [settings] = await db
    .select({
      buyRate: schema.userSettings.usdBuyRate,
      sellRate: schema.userSettings.usdSellRate,
    })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  return settings ?? DEFAULT_QUOTE_SETTINGS;
}

export async function saveQuoteSettings<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  settings: QuoteSettings,
): Promise<QuoteSettings> {
  const [saved] = await db
    .insert(schema.userSettings)
    .values({
      userId,
      usdBuyRate: settings.buyRate,
      usdSellRate: settings.sellRate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        usdBuyRate: settings.buyRate,
        usdSellRate: settings.sellRate,
        updatedAt: new Date(),
      },
    })
    .returning({
      buyRate: schema.userSettings.usdBuyRate,
      sellRate: schema.userSettings.usdSellRate,
    });
  return saved;
}
