import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { authRequestResponse } from "@/modules/auth/http";
export const runtime = "nodejs";
async function handle(request: Request) {
  return authRequestResponse(request, () => getAuthRuntime().auth, getAccess);
}
export const GET = handle;
export const POST = handle;
