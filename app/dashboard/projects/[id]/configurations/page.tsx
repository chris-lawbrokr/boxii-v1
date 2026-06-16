import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2, Layers, ArrowUpRight } from "lucide-react";
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
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Popover designs for <span className="font-medium">{project.name}</span>, built from its
            gathered details.
          </p>
        </div>
        <form action={createConfigurationAction.bind(null, project.id)} className="flex shrink-0 gap-2">
          <input
            name="name"
            placeholder="New configuration name"
            className="w-48 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </div>

      {configs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-900">No configurations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Add a configuration to start building popover designs from this site&apos;s gathered
            details.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configs.map((c) => (
            <li
              key={c.id}
              className="relative rounded-2xl border border-gray-200/80 bg-white p-5 shadow-float transition hover:-translate-y-0.5 hover:border-gray-300"
            >
              <Link
                href={`/dashboard/projects/${project.id}/configurations/${c.id}`}
                aria-label={`Open ${c.name}`}
                className="absolute inset-0 rounded-2xl"
              />
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate font-semibold text-gray-900">{c.name}</h2>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1 truncate text-sm text-gray-500">
                  Open design
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                </p>
                <form
                  action={deleteConfigurationAction.bind(null, c.id, project.id)}
                  className="relative z-10"
                >
                  <button
                    type="submit"
                    className="text-gray-400 hover:text-red-600"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
