import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { GetAccess } from "@/modules/auth/http";
import { validateAccountCreation, validateAccountRename, validateOpeningBalance } from "./domain";
import {
  createAccount,
  configureOpeningBalance,
  archiveAccount,
  unarchiveAccount,
  listAccounts,
  renameAccount,
  type AccountsDatabase,
} from "./service";

const headers = { "Cache-Control": "no-store" };

function denied(status: "unauthenticated" | "forbidden") {
  return Response.json(
    { error: status === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" },
    { status: status === "unauthenticated" ? 401 : 403, headers },
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function accountsCollectionResponse<T extends PgQueryResultHKT>(
  request: Request,
  db: AccountsDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);

    if (request.method === "GET") {
      return Response.json(
        { accounts: await listAccounts(db, access.userId) },
        { headers },
      );
    }
    if (request.method === "POST") {
      const validation = validateAccountCreation(await readJson(request));
      if (!validation.ok) {
        return Response.json(
          { error: validation.error },
          { status: 422, headers },
        );
      }
      return Response.json(
        await createAccount(db, access.userId, validation.value),
        { status: 201, headers },
      );
    }
    return Response.json(
      { error: "METHOD_NOT_ALLOWED" },
      { status: 405, headers },
    );
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function accountResourceResponse<T extends PgQueryResultHKT>(
  request: Request,
  accountId: string,
  db: AccountsDatabase<T>,
  getAccess: GetAccess,
): Promise<Response> {
  try {
    const access = await getAccess(request.headers);
    if (access.status !== "authorized") return denied(access.status);
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/opening-balance")) {
      const input = await readJson(request);
      if (!input || typeof input !== "object" || !("amount" in input) || !("date" in input) || typeof input.amount !== "string" || typeof input.date !== "string") return Response.json({ error: "INVALID_OPENING_BALANCE" }, { status: 422, headers });
      const validation = validateOpeningBalance({ amount: input.amount, date: input.date });
      if (!validation.ok) return Response.json({ error: validation.error }, { status: 422, headers });
      const account = await configureOpeningBalance(db, access.userId, accountId, validation.value);
      if (!account) return Response.json({ error: "NOT_FOUND_OR_ALREADY_CONFIGURED" }, { status: 404, headers });
      const updated = (await listAccounts(db, access.userId, true)).find((item) => item.id === account.id);
      return Response.json(updated, { headers });
    }
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/archive")) {
      const account = await archiveAccount(db, access.userId, accountId);
      return account ? Response.json(account, { headers }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/unarchive")) {
      const account = await unarchiveAccount(db, access.userId, accountId);
      return account ? Response.json(account, { headers }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    if (request.method !== "PATCH") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED" },
        { status: 405, headers },
      );
    }
    const validation = validateAccountRename(await readJson(request));
    if (!validation.ok) {
      return Response.json(
        { error: validation.error },
        { status: 422, headers },
      );
    }
    const account = await renameAccount(
      db,
      access.userId,
      accountId,
      validation.value.name,
    );
    if (!account)
      return Response.json({ error: "NOT_FOUND" }, { status: 404, headers });
    return Response.json(account, { headers });
  } catch {
    return Response.json(
      { error: "SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
