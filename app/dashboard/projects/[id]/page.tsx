import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { getProject } from "@/app/lib/db/projects";
import { listConfigurations } from "@/app/lib/db/configurations";
import {
  runGatherAction,
  deleteProjectAction,
  createConfigurationAction,
  deleteConfigurationAction,
} from "@/app/lib/project-actions";
import { StatusBadge } from "@/app/ui/status-badge";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/login");
  const project = await getProject(id, user.id);
  if (!project) notFound();

  const configs = project.status === "ready" ? await listConfigurations(project.id) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
        ← Projects
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <a
            href={project.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-indigo-600 hover:text-indigo-500"
          >
            {project.siteUrl}
          </a>
        </div>
        <form action={deleteProjectAction.bind(null, project.id)}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Delete
          </button>
        </form>
      </div>

      {/* Gather flow (re-scan / recovery) */}
      {(project.status === "gathering" || project.status === "failed") && (
        <section
          className={`mt-8 rounded-2xl border p-6 ${
            project.status === "failed"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <h2 className="font-semibold text-gray-900">
            {project.status === "failed" ? "Scan failed" : "Gathering site details"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {project.status === "failed"
              ? "We couldn't scan this site. You can try again."
              : "We collect the brand identity, site map, and summary before you build popovers."}{" "}
            <span className="font-medium">{project.siteUrl}</span>
          </p>
          <form action={runGatherAction.bind(null, project.id)} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {project.status === "failed" ? "Try again" : "Scan now"}
            </button>
          </form>
        </section>
      )}

      {/* Gathered details */}
      {project.status === "ready" && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <Panel title="Brand identity">
              {project.brandIdentity ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {project.brandIdentity.colors.map((c) => (
                      <span key={c} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span
                          className="inline-block h-4 w-4 rounded border border-gray-200"
                          style={{ backgroundColor: c }}
                        />
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Fonts:</span>{" "}
                    {project.brandIdentity.fonts.join(", ")}
                  </p>
                  {project.brandIdentity.voice && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Voice:</span>{" "}
                      {project.brandIdentity.voice}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No brand identity gathered.</p>
              )}
            </Panel>

            <Panel title="Site map">
              {project.siteMap && project.siteMap.length > 0 ? (
                <ul className="space-y-1 text-sm text-gray-600">
                  {project.siteMap.map((entry) => (
                    <li key={entry.url} className="flex justify-between gap-2">
                      <span className="font-medium text-gray-800">{entry.title}</span>
                      <span className="truncate text-gray-400">{entry.url}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No pages gathered.</p>
              )}
            </Panel>
          </section>

          <Panel title="Summary & objective" className="mt-4">
            <p className="text-sm text-gray-600">{project.summary}</p>
          </Panel>

          {/* Configurations */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Configurations</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Each configuration is a popover design built from this project&apos;s details.
            </p>

            <form
              action={createConfigurationAction.bind(null, project.id)}
              className="mt-4 flex gap-2"
            >
              <input
                name="name"
                placeholder="New configuration name"
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Add
              </button>
            </form>

            {configs.length > 0 ? (
              <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
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
                        className="text-sm text-gray-400 hover:text-red-600"
                        aria-label={`Delete ${c.name}`}
                      >
                        Delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-400">No configurations yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}
