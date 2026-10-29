import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { conversionResourceResponse } from "@/modules/conversions/http";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return conversionResourceResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return conversionResourceResponse(request, id, getAuthRuntime().db, getAccess);
}
