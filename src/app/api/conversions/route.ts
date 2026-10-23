import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { conversionsCollectionResponse } from "@/modules/conversions/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return conversionsCollectionResponse(request, getAuthRuntime().db, getAccess);
}
