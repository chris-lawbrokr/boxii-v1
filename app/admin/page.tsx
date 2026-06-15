import { redirect } from "next/navigation";

// For now admins use the same dashboard as everyone else. This route is kept
// (redirecting) so it's easy to give admins a distinct console again later.
export default function AdminPage() {
  redirect("/dashboard");
}
