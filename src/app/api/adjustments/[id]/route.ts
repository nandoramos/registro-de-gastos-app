import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { adjustmentResourceResponse } from "@/modules/adjustments/http";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return adjustmentResourceResponse(request, id, getAuthRuntime().db, getAccess); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return adjustmentResourceResponse(request, id, getAuthRuntime().db, getAccess); }
