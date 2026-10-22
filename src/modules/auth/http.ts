import type { authorizeSession } from "./access";

export async function privateSessionResponse(
  request: Request,
  getAccess: (headers: Headers) => ReturnType<typeof authorizeSession>,
): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const access = await getAccess(request.headers);
    if (access.status === "unauthenticated")
      return Response.json(
        { error: "UNAUTHENTICATED" },
        { status: 401, headers },
      );
    if (access.status === "forbidden")
      return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
    return Response.json({ userId: access.userId }, { headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
