import type { AuthConfig } from "./config";

export function readAuthEnv(
  env: NodeJS.ProcessEnv,
): AuthConfig & { databaseURL: string } {
  function required(name: string): string {
    const value = env[name];
    if (!value || /REPLACE_WITH|USER:PASSWORD/.test(value))
      throw new Error(`Missing configuration: ${name}`);
    return value;
  }
  const secret = required("BETTER_AUTH_SECRET");
  if (secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must have at least 32 characters");
  const baseURL = required("BETTER_AUTH_URL");
  const url = new URL(baseURL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("Invalid BETTER_AUTH_URL");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("BETTER_AUTH_URL requires HTTPS outside localhost");
  return {
    baseURL,
    secret,
    databaseURL: required("DATABASE_URL"),
    googleClientId: required("GOOGLE_CLIENT_ID"),
    googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
    allowedGoogleSub: required("GOOGLE_ALLOWED_SUB"),
  };
}
