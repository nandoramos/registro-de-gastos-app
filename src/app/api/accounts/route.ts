import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { accountsCollectionResponse } from "@/modules/accounts/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return accountsCollectionResponse(request, getAuthRuntime().db, getAccess);
}

export async function POST(request: Request) {
  return accountsCollectionResponse(request, getAuthRuntime().db, getAccess);
}
