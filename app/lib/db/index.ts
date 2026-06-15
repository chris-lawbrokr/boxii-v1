/**
 * @file Neon + Drizzle client and user queries.
 *
 * Auth data (accounts + scrypt password hashes) lives in Neon. `DATABASE_URL`
 * must be set for auth to work; `getDb()` returns null when it isn't so
 * non-auth callers can degrade gracefully.
 */

import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import type { UserRow } from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null | undefined;

/** Lazily build the Drizzle client. Returns null when DATABASE_URL is unset. */
export function getDb(): NeonHttpDatabase<typeof schema> | null {
  if (_db !== undefined) return _db;
  const url = process.env.DATABASE_URL;
  _db = url ? drizzle(neon(url), { schema }) : null;
  return _db;
}

/** Require a configured DB — auth can't work without persistence. */
export function requireDb(): NeonHttpDatabase<typeof schema> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set — Boxii auth requires a database.");
  return db;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await requireDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "customer" | "admin";
}): Promise<UserRow> {
  const rows = await requireDb()
    .insert(schema.users)
    .values({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role ?? "customer",
      passwordHash: input.passwordHash,
    })
    .returning();
  return rows[0];
}

export async function touchLastLogin(id: string): Promise<void> {
  await requireDb()
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, id));
}

export async function setUserPassword(id: string, passwordHash: string): Promise<void> {
  await requireDb()
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, id));
}
