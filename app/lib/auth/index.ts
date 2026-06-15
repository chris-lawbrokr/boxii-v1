/**
 * @file Neon-backed authentication — the single auth path for Boxii.
 *
 * Accounts live in Neon Postgres with scrypt-hashed passwords. This module is
 * the whole auth API: `login`, `signup`, plus lazy seeding of demo accounts for
 * local development.
 */

import "server-only";
import type { AuthUser } from "./types";
import { AuthError } from "./types";
import { hashPassword, verifyPassword } from "./password";
import { createUser, findUserByEmail, getDb, setUserPassword, touchLastLogin } from "../db";
import type { UserRow } from "../db/schema";

const DEMO_PASSWORD = "boxii1234";
const DEMO_ACCOUNTS: Array<{ email: string; name: string; role: "customer" | "admin" }> = [
  { email: "customer@boxii.test", name: "Casey Customer", role: "customer" },
  { email: "admin@boxii.test", name: "Avery Admin", role: "admin" },
];

let seeded = false;

/**
 * Ensure the demo accounts exist (once per server process), in dev only.
 * Best-effort: a failure is logged and retried on the next request.
 */
async function ensureSeeded(): Promise<void> {
  if (seeded || process.env.NODE_ENV === "production" || !getDb()) return;
  seeded = true;
  try {
    for (const a of DEMO_ACCOUNTS) {
      const existing = await findUserByEmail(a.email);
      if (!existing) {
        await createUser({ ...a, passwordHash: await hashPassword(DEMO_PASSWORD) });
      } else if (!existing.passwordHash) {
        // Repair a demo row created before passwords existed.
        await setUserPassword(existing.id, await hashPassword(DEMO_PASSWORD));
      }
    }
  } catch (err) {
    seeded = false;
    console.warn("[boxii] demo seed failed:", err);
  }
}

function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Verify email + password. Returns the user, or `null` on bad credentials. */
export async function login(email: string, password: string): Promise<AuthUser | null> {
  await ensureSeeded();
  const row = await findUserByEmail(email);
  if (!row || !(await verifyPassword(password, row.passwordHash))) return null;
  await touchLastLogin(row.id);
  return toAuthUser(row);
}

/** Create a new customer account. Throws `AuthError` if the email is taken. */
export async function signup(email: string, name: string, password: string): Promise<AuthUser> {
  await ensureSeeded();
  if (await findUserByEmail(email)) {
    throw new AuthError("An account with that email already exists.");
  }
  const row = await createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    role: "customer",
  });
  return toAuthUser(row);
}

export type { AuthUser, Role } from "./types";
export { AuthError } from "./types";
