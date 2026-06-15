import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getProjectForView } from "@/app/lib/project-data";
import { ProjectNav } from "./project-nav";

/** Sidebar slot inside a project — renders the tab nav (back + Brand details +
 *  Configurations). Server component: fetches the project (scoped to the user). */
export async function ProjectSidebar({ id }: { id: string }) {
  const user = await requireUser("/login");
  const project = await getProjectForView(id, user.id);

  if (!project) {
    return (
      <div className="text-sm text-gray-500">
        <Link
          href="/dashboard"
          className="flex w-fit items-center gap-1 text-xs hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <p className="mt-3">Project not found.</p>
      </div>
    );
  }

  return (
    <ProjectNav projectId={project.id} projectName={project.name} status={project.status} />
  );
}
