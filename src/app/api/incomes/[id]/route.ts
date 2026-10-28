import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { incomeResourceResponse } from "@/modules/incomes/http";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return incomeResourceResponse(request, id, getAuthRuntime().db, getAccess);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return incomeResourceResponse(request, id, getAuthRuntime().db, getAccess);
}
