import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { emailEntriesCollectionResponse } from "@/modules/email-import/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return emailEntriesCollectionResponse(
    request,
    getAuthRuntime().db,
    getAccess,
  );
}
