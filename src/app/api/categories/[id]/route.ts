import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { categoryResourceResponse } from "@/modules/categories/http";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return categoryResourceResponse(request, id, getAuthRuntime().db, getAccess);
}
