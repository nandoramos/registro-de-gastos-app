import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { initialCategories, type CategoryView } from "./domain";

export type CategoriesDatabase<T extends PgQueryResultHKT> = PgDatabase<
  T,
  typeof schema
>;

const categorySelection = {
  id: schema.expenseCategory.id,
  name: schema.expenseCategory.name,
  systemKey: schema.expenseCategory.systemKey,
  archivedAt: schema.expenseCategory.archivedAt,
};

export async function ensureInitialCategories<T extends PgQueryResultHKT>(
  db: CategoriesDatabase<T>,
  userId: string,
): Promise<void> {
  await db
    .insert(schema.expenseCategory)
    .values(
      initialCategories.map(([systemKey, name]) => ({
        id: crypto.randomUUID(),
        userId,
        systemKey,
        name,
      })),
    )
    .onConflictDoNothing();
}

export async function listCategories<T extends PgQueryResultHKT>(
  db: CategoriesDatabase<T>,
  userId: string, includeArchived = false,
): Promise<CategoryView[]> {
  await ensureInitialCategories(db, userId);
  return db
    .select(categorySelection)
    .from(schema.expenseCategory)
    .where(and(eq(schema.expenseCategory.userId, userId), ...(includeArchived ? [] : [isNull(schema.expenseCategory.archivedAt)])))
    .orderBy(asc(schema.expenseCategory.name));
}

export async function archiveCategory<T extends PgQueryResultHKT>(db: CategoriesDatabase<T>, userId: string, categoryId: string) {
  const [category] = await db.update(schema.expenseCategory).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.expenseCategory.id, categoryId), eq(schema.expenseCategory.userId, userId), isNull(schema.expenseCategory.archivedAt))).returning(categorySelection); return category;
}

export async function unarchiveCategory<T extends PgQueryResultHKT>(db: CategoriesDatabase<T>, userId: string, categoryId: string) {
  const [category] = await db.update(schema.expenseCategory).set({ archivedAt: null, updatedAt: new Date() }).where(and(eq(schema.expenseCategory.id, categoryId), eq(schema.expenseCategory.userId, userId), isNotNull(schema.expenseCategory.archivedAt))).returning(categorySelection);
  return category;
}

export async function createCategory<T extends PgQueryResultHKT>(
  db: CategoriesDatabase<T>,
  userId: string,
  name: string,
): Promise<CategoryView> {
  const [category] = await db
    .insert(schema.expenseCategory)
    .values({ id: crypto.randomUUID(), userId, name, systemKey: null })
    .returning(categorySelection);
  return category;
}

export async function renameCategory<T extends PgQueryResultHKT>(
  db: CategoriesDatabase<T>,
  userId: string,
  categoryId: string,
  name: string,
): Promise<CategoryView | undefined> {
  const [category] = await db
    .update(schema.expenseCategory)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(schema.expenseCategory.id, categoryId),
        eq(schema.expenseCategory.userId, userId),
      ),
    )
    .returning(categorySelection);
  return category;
}
