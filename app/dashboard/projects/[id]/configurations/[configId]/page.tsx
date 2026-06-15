import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";
import { StatusBadge } from "@/app/ui/status-badge";

export default async function ConfigEditorPage({
  params,
}: {
  params: Promise<{ id: string; configId: string }>;
}) {
  const { id, configId } = await params;
  const user = await requireUser("/login");
  const found = await getConfigurationForUser(configId, user.id);
  if (!found || found.project.id !== id) notFound();

  const { config, project } = found;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← {project.name}
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{config.name}</h1>
        <StatusBadge status={config.status} />
      </div>

      {/* Placeholder for the drag-and-drop builder */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[200px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Widgets
          </h2>
          <ul className="space-y-2">
            {["Text", "Image", "Button", "Form", "Spacer"].map((w) => (
              <li
                key={w}
                className="cursor-not-allowed rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400"
              >
                {w}
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex min-h-80 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <div>
            <p className="text-sm font-medium text-gray-900">Drag-and-drop builder coming soon</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              This canvas will let you drop widgets to design a popover, pre-styled from{" "}
              <span className="font-medium">{project.name}</span>&apos;s gathered brand identity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
