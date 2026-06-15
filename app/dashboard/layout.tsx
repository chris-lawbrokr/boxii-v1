import type { ReactNode } from "react";
import { getCurrentUser } from "@/app/lib/dal";
import { listProjects } from "@/app/lib/db/projects";
import { DashboardShell } from "@/app/ui/dashboard-shell";

export default async function DashboardLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  /** Parallel-route slot — varies the sidebar by route (@sidebar). */
  sidebar: ReactNode;
}) {
  const user = await getCurrentUser();
  const safeUser = user ? { name: user.name, email: user.email } : null;
  const projects = user
    ? (await listProjects(user.id)).map((p) => ({ id: p.id, name: p.name }))
    : [];

  return (
    <DashboardShell user={safeUser} projects={projects} sidebar={sidebar}>
      {children}
    </DashboardShell>
  );
}
