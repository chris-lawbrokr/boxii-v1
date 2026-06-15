/**
 * @file Core auth types.
 *
 * Boxii handles auth itself: accounts (with scrypt-hashed passwords) live in
 * Neon Postgres. See `app/lib/auth/index.ts`.
 */

export type Role = "customer" | "admin";

/** Minimal, non-sensitive user shape carried in the session + UI. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Thrown for expected auth failures (e.g. email already taken). */
export class AuthError extends Error {}
