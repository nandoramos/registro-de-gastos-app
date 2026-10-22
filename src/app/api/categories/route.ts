import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { categoriesCollectionResponse } from "@/modules/categories/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return categoriesCollectionResponse(request, getAuthRuntime().db, getAccess);
}

export async function POST(request: Request) {
  return categoriesCollectionResponse(request, getAuthRuntime().db, getAccess);
}
