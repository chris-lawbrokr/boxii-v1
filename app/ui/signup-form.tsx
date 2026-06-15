"use client";

import { useActionState } from "react";
import { signup, type AuthFormState } from "@/app/lib/actions";
import { Field, FormError, SubmitButton } from "./form-controls";

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signup, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" name="name" autoComplete="name" placeholder="Jane Doe" />
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
      />
      <FormError message={state?.error} />
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
