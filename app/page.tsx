import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/dal";

export default async function Home() {
  // No marketing splash — root goes straight to the app (if signed in) or login.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}
