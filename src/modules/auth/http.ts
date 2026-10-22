import type { authorizeSession } from "./access";

type Access = Awaited<ReturnType<typeof authorizeSession>>;
type GetAccess = (headers: Headers) => Promise<Access>;
const privateHeaders = { "Cache-Control": "no-store" };

function denial(access: Access): Response | undefined {
  if (access.status === "unauthenticated") {
    return Response.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: privateHeaders },
    );
  }
  if (access.status === "forbidden") {
    return Response.json(
      { error: "FORBIDDEN" },
      { status: 403, headers: privateHeaders },
    );
  }
}

export async function privateSessionResponse(
  request: Request,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denial(access)!;
    return Response.json(
      { userId: access.userId },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: privateHeaders },
    );
  }
}

// Only expose the auth operations actually used by this installation.
const publicAuthOperations = new Set([
  "POST /api/auth/sign-in/social",
  "GET /api/auth/callback/google",
  "POST /api/auth/sign-out",
]);

export async function authRequestResponse(
  request: Request,
  getAuth: () => { handler: (request: Request) => Promise<Response> },
  getAccess: GetAccess,
): Promise<Response> {
  const operation = `${request.method} ${new URL(request.url).pathname}`;
  const readsSession = operation === "GET /api/auth/get-session";
  if (!readsSession && !publicAuthOperations.has(operation)) {
    return Response.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: privateHeaders },
    );
  }
  try {
    if (readsSession) {
      // Internal getSession calls the library directly, not this HTTP gate.
      const denied = denial(await getAccess(request.headers));
      if (denied) return denied;
    }
    const response = await getAuth().handler(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json(
      { error: "AUTH_UNAVAILABLE" },
      { status: 503, headers: privateHeaders },
    );
  }
}
