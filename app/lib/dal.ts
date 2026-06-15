/**
 * @file Data Access Layer — centralized auth checks.
 *
 * Per the Next.js auth guidance: do auth checks close to the data, not in
 * layouts. `getCurrentUser` is memoized per render pass. `requireUser` /
 * `requireAdmin` redirect when the caller isn't authorized.
 */

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { AuthUser } from "./auth/types";

/** Returns the logged-in user (optimistic: trusts the signed cookie) or null. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await getSession();
  return session?.user ?? null;
});

/** Require any authenticated user; redirect to a login page otherwise. */
export async function requireUser(loginPath = "/login"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

/** Require an admin; everyone else is sent to login (admins route in on sign-in). */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
