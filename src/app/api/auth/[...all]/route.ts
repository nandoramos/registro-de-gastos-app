import { getAuthRuntime } from "@/modules/auth/server";
export const runtime = "nodejs";
async function handle(request: Request) {
  try {
    return await getAuthRuntime().auth.handler(request);
  } catch {
    return Response.json(
      { error: "AUTH_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = handle;
export const POST = handle;
