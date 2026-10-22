import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { expensesCollectionResponse } from "@/modules/expenses/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return expensesCollectionResponse(request, getAuthRuntime().db, getAccess);
}
