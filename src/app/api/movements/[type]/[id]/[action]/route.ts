import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { movementStatusResponse } from "@/modules/movements/http";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ type: string; id: string; action: string }> }) {
  const { type, id, action } = await params;
  return movementStatusResponse(request, type, id, action, getAuthRuntime().db, getAccess);
}
