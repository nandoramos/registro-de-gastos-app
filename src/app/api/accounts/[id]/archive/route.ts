import { getAccess, getAuthRuntime } from "@/modules/auth/server";
import { accountResourceResponse } from "@/modules/accounts/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return accountResourceResponse(request, (await params).id, getAuthRuntime().db, getAccess); }
