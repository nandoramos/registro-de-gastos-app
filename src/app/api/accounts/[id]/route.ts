import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { accountResourceResponse } from "@/modules/accounts/http";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return accountResourceResponse(request, id, getAuthRuntime().db, getAccess);
}
