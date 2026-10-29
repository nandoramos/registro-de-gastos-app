import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { categoryResourceResponse } from "@/modules/categories/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return categoryResourceResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}
