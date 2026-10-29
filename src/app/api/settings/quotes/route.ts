import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { quoteSettingsResponse } from "@/modules/settings/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return quoteSettingsResponse(request, getAuthRuntime().db, getAccess);
}

export async function PATCH(request: Request) {
  return quoteSettingsResponse(request, getAuthRuntime().db, getAccess);
}
