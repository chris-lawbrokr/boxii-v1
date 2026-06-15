import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/dal";
import { AuthCard } from "@/app/ui/auth-card";
import { LoginForm } from "@/app/ui/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          New user?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 underline hover:text-indigo-500">
            Create account here
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
