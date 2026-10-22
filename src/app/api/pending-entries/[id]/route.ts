import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { pendingEntryResourceResponse } from "@/modules/pending-entries/http";

export const runtime = "nodejs";
async function handle(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return pendingEntryResourceResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}
export const GET = handle;
export const PATCH = handle;
