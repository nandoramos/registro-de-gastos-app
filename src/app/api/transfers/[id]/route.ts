import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { transferResourceResponse } from "@/modules/transfers/http";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return transferResourceResponse(
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
  return transferResourceResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}
