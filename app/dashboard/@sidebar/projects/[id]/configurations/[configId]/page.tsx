import { ProjectSidebar } from "@/app/ui/project-sidebar";

// Config editor — keep the project sidebar.
export default async function SidebarConfigSlot({
  params,
}: {
  params: Promise<{ id: string; configId: string }>;
}) {
  const { id } = await params;
  return <ProjectSidebar id={id} />;
}
