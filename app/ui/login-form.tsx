"use client";

import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/lib/actions";
import { Field, FormError, SubmitButton } from "./form-controls";

export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="email@example.com" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
      />
      <FormError message={state?.error} />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
