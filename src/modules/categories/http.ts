import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import { validateCategoryName } from "./domain";
import {
  createCategory,
  archiveCategory,
  listCategories,
  renameCategory,
  unarchiveCategory,
  type CategoriesDatabase,
} from "./service";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function categoriesCollectionResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: CategoriesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "GET") {
      return Response.json(
        { categories: await listCategories(db, access.userId) },
        { headers },
      );
    }
    if (request.method === "POST") {
      const validation = validateCategoryName(await readJsonBody(request));
      if (!validation.ok) {
        return Response.json(
          { error: validation.error },
          { status: 422, headers },
        );
      }
      return Response.json(
        await createCategory(db, access.userId, validation.value.name),
        { status: 201, headers },
      );
    }
    return Response.json(
      { error: "METHOD_NOT_ALLOWED" },
      { status: 405, headers },
    );
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function categoryResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  categoryId: string,
  db: CategoriesDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/archive")) {
      const category = await archiveCategory(db, access.userId, categoryId);
      return category ? Response.json(category, { headers }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/unarchive")) {
      const category = await unarchiveCategory(db, access.userId, categoryId);
      return category ? Response.json(category, { headers }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (request.method !== "PATCH") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const validation = validateCategoryName(await readJsonBody(request));
    if (!validation.ok) {
      return Response.json(
        { error: validation.error },
        { status: 422, headers },
      );
    }
    const category = await renameCategory(
      db,
      access.userId,
      categoryId,
      validation.value.name,
    );
    if (!category)
      return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    return Response.json(category, { headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
