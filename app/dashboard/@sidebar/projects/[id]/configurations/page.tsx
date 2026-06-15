import { ProjectSidebar } from "@/app/ui/project-sidebar";

// Configurations tab — keep the project tab nav.
export default async function SidebarConfigsSlot({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSidebar id={id} />;
}
