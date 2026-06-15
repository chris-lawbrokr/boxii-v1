/**
 * @file Boxii session — an encrypted, httpOnly cookie (jose JWT).
 *
 * After a successful login/signup we mint a session carrying the user's
 * non-sensitive fields. Optimistic checks (proxy, UI) read this cookie
 * directly; secure checks live in the DAL.
 */

import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AuthUser } from "./auth/types";

const COOKIE_NAME = "boxii_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  user: AuthUser;
  [key: string]: unknown;
}

function encodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(encodedKey());
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), { algorithms: ["HS256"] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Create the session cookie after a successful login. */
export async function createSession(user: AuthUser): Promise<void> {
  const token = await encrypt({ user });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Read + verify the current session cookie. Returns null when absent/invalid. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return decrypt(token);
}

/** Read the session straight from a token string (used in proxy). */
export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  return decrypt(token);
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
