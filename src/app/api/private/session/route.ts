import { getAccess } from "@/modules/auth/server";
import { privateSessionResponse } from "@/modules/auth/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return privateSessionResponse(request, getAccess);
}
