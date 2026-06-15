import { ProjectSidebar } from "@/app/ui/project-sidebar";

export default async function ProjectSidebarSlot({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSidebar id={id} />;
}
