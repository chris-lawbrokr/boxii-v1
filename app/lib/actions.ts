"use server";

/**
 * @file Auth server actions — login (customer / admin), signup, logout.
 *
 * Errors surface to the forms via useActionState.
 */

import { z } from "zod";
import { redirect } from "next/navigation";
import { login as authLogin, signup as authSignup, AuthError } from "./auth";
import { createSession, deleteSession } from "./session";

const Credentials = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

const SignupSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name."),
    email: z.email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    error: "Passwords do not match.",
    path: ["confirm"],
  });

export type AuthFormState = { error?: string } | undefined;

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await authLogin(parsed.data.email, parsed.data.password);
  } catch (err) {
    console.error("[boxii] login error:", err);
    return { error: "Authentication service is unavailable. Please try again." };
  }

  if (!user) return { error: "Invalid email or password." };

  await createSession(user);

  // Admins are routed to the console automatically — no separate admin login.
  // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let user;
  try {
    user = await authSignup(parsed.data.email, parsed.data.name, parsed.data.password);
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    console.error("[boxii] signup error:", err);
    return { error: "Could not create your account. Please try again." };
  }

  await createSession(user);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
