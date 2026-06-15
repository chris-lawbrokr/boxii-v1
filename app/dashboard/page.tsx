import Link from "next/link";
import { requireUser } from "@/app/lib/dal";
import { listProjects } from "@/app/lib/db/projects";
import { StatusBadge } from "@/app/ui/status-badge";

export default async function DashboardPage() {
  const user = await requireUser("/login");
  const projects = await listProjects(user.id);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">One project per site you want Boxii on.</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No projects yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Create your first project. We&apos;ll gather the site&apos;s brand identity, site map,
            and objective so you can start building popovers.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            New project
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}`}
                className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate font-semibold text-gray-900">{p.name}</h2>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">{p.siteUrl}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
