import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { discardedEntryResourceResponse } from "@/modules/discarded-entries/http";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return discardedEntryResourceResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}
