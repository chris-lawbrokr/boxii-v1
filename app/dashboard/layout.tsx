import type { ReactNode } from "react";
import { getCurrentUser } from "@/app/lib/dal";
import { DashboardShell } from "@/app/ui/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const safeUser = user ? { name: user.name, email: user.email } : null;
  return <DashboardShell user={safeUser}>{children}</DashboardShell>;
}
