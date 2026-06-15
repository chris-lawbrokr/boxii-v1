import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getProjectForView } from "@/app/lib/project-data";
import { listConfigurations } from "@/app/lib/db/configurations";
import { createConfigurationAction, deleteConfigurationAction } from "@/app/lib/project-actions";
import { StatusBadge } from "@/app/ui/status-badge";

export default async function ConfigurationsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/login");
  const project = await getProjectForView(id, user.id);
  if (!project) notFound();

  const configs = await listConfigurations(project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurations</h1>
      <p className="mt-1 text-sm text-gray-500">
        Popover designs for <span className="font-medium">{project.name}</span>, built from its
        gathered details.
      </p>

      <form action={createConfigurationAction.bind(null, project.id)} className="mt-5 flex gap-2">
        <input
          name="name"
          placeholder="New configuration name"
          className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {configs.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white shadow-float">
          {configs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link
                href={`/dashboard/projects/${project.id}/configurations/${c.id}`}
                className="flex min-w-0 items-center gap-2"
              >
                <span className="truncate font-medium text-gray-900 hover:text-indigo-600">
                  {c.name}
                </span>
                <StatusBadge status={c.status} />
              </Link>
              <form action={deleteConfigurationAction.bind(null, c.id, project.id)}>
                <button
                  type="submit"
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-400">No configurations yet. Add one to start building.</p>
      )}
    </div>
  );
}
