import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { adjustmentCollectionResponse } from "@/modules/adjustments/http";
export const runtime = "nodejs";
export async function POST(request: Request) { return adjustmentCollectionResponse(request, getAuthRuntime().db, getAccess); }
