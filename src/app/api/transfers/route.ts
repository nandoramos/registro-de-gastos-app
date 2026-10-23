import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { transfersCollectionResponse } from "@/modules/transfers/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return transfersCollectionResponse(request, getAuthRuntime().db, getAccess);
}
