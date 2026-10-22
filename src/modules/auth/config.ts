import { betterAuth } from "better-auth";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import * as schema from "@/db/schema";
import { assertGoogleIdentity } from "./access";
import { ownsGoogleIdentity, type AuthDatabase } from "./identity-store";

export type AuthConfig = {
  baseURL: string;
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
  allowedGoogleSub: string;
};

export function createAuth<T extends PgQueryResultHKT>(
  db: AuthDatabase<T>,
  config: AuthConfig,
) {
  return betterAuth({
    appName: "Registro de Gastos",
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [new URL(config.baseURL).origin],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        disableDefaultScope: true,
        scope: ["openid", "email", "profile"],
        includeGrantedScopes: false,
        accessType: "online",
        prompt: "select_account",
        disableIdTokenSignIn: true,
        mapProfileToUser(profile) {
          try {
            assertGoogleIdentity(profile, config.allowedGoogleSub);
          } catch {
            throw new APIError("FORBIDDEN", { message: "ACCESS_DENIED" });
          }
          return { name: "Usuario", image: undefined };
        },
      },
    },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    // Avoid leaking provider profiles, tokens or database errors in application logs.
    logger: { disabled: true },
    onAPIError: { errorURL: "/login?error=access" },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const origin = ctx.headers?.get("origin");
        if (origin && origin !== new URL(config.baseURL).origin) {
          throw new APIError("FORBIDDEN", { message: "ACCESS_DENIED" });
        }
        if (ctx.path === "/sign-in/social") {
          const scopes = ctx.body?.scopes;
          if (
            ctx.body?.provider !== "google" ||
            (scopes &&
              (!Array.isArray(scopes) ||
                scopes.some(
                  (scope: unknown) =>
                    !["openid", "email", "profile"].includes(String(scope)),
                )))
          ) {
            throw new APIError("FORBIDDEN", { message: "ACCESS_DENIED" });
          }
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            if (
              !(await ownsGoogleIdentity(
                db,
                session.userId,
                config.allowedGoogleSub,
              ))
            ) {
              throw new APIError("FORBIDDEN", { message: "ACCESS_DENIED" });
            }
            return { data: session };
          },
        },
      },
    },
  });
}
