import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { expenseResourceResponse } from "@/modules/expenses/http";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return expenseResourceResponse(request, id, getAuthRuntime().db, getAccess);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return expenseResourceResponse(request, id, getAuthRuntime().db, getAccess);
}
