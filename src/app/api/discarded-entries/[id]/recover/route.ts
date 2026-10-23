import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { discardedEntryRecoverResponse } from "@/modules/discarded-entries/http";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return discardedEntryRecoverResponse(
    request,
    (await params).id,
    getAuthRuntime().db,
    getAccess,
  );
}
