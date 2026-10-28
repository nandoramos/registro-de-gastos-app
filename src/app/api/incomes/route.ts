import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { incomesCollectionResponse } from "@/modules/incomes/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return incomesCollectionResponse(request, getAuthRuntime().db, getAccess);
}
