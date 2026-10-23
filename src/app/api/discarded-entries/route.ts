import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { discardedEntriesCollectionResponse } from "@/modules/discarded-entries/http";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return discardedEntriesCollectionResponse(
    request,
    getAuthRuntime().db,
    getAccess,
  );
}
