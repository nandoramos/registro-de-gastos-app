import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { pendingEntriesCollectionResponse } from "@/modules/pending-entries/http";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return pendingEntriesCollectionResponse(
    request,
    getAuthRuntime().db,
    getAccess,
  );
}
export async function POST(request: Request) {
  return pendingEntriesCollectionResponse(
    request,
    getAuthRuntime().db,
    getAccess,
  );
}
