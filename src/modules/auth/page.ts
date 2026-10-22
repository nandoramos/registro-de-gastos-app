import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccess } from "./server";

export async function requireAuthorizedPage() {
  let access;
  try {
    access = await getAccess(await headers());
  } catch {
    redirect("/login?error=unavailable");
  }
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "forbidden") redirect("/login?error=access");
  return access;
}
