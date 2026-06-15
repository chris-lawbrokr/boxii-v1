import { ProjectSidebar } from "@/app/ui/project-sidebar";

/** Keeps the project sidebar for deeper routes (e.g. the configuration editor). */
export default async function ProjectSidebarDefault({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSidebar id={id} />;
}
