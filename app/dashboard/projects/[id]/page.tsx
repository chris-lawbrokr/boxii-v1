import { notFound } from "next/navigation";
import { Search, RotateCw } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getProjectForView } from "@/app/lib/project-data";
import { runGatherAction } from "@/app/lib/project-actions";

export default async function BrandDetailsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/login");
  const project = await getProjectForView(id, user.id);
  if (!project) notFound();

  if (project.status !== "ready") {
    return (
      <div className="mx-auto max-w-2xl">
        <section
          className={`rounded-2xl border p-6 ${
            project.status === "failed"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <h1 className="text-lg font-semibold text-gray-900">
            {project.status === "failed" ? "Scan failed" : "Gathering site details"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {project.status === "failed"
              ? "We couldn't scan this site. Try again."
              : "Scan the site to gather its brand identity, site map, and summary."}{" "}
            <span className="font-medium">{project.siteUrl}</span>
          </p>
          <form action={runGatherAction.bind(null, project.id)} className="mt-4">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {project.status === "failed" ? (
                <RotateCw className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {project.status === "failed" ? "Try again" : "Scan now"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const brand = project.brandIdentity;

  return (
    <div className="flex h-full flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Brand details</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gathered from{" "}
        <a
          href={project.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-500"
        >
          {project.siteUrl}
        </a>
        .
      </p>

      <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-3 sm:grid-rows-2">
        <Tile className="sm:col-span-2">
          <SectionHeading>Brand identity</SectionHeading>
          {brand && (brand.colors.length > 0 || brand.fonts.length > 0 || brand.voice) ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {brand.colors.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-xs text-gray-600">
                    <span
                      className="h-6 w-6 shrink-0 rounded border border-gray-200"
                      style={{ backgroundColor: c }}
                    />
                    <span className="font-mono">{c}</span>
                  </div>
                ))}
              </div>
              {brand.fonts.length > 0 && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Fonts:</span> {brand.fonts.join(", ")}
                </p>
              )}
              {brand.voice && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Voice:</span> {brand.voice}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No brand identity gathered.</p>
          )}
        </Tile>

        <Tile className="sm:row-span-2">
          <SectionHeading>Site map</SectionHeading>
          {project.siteMap && project.siteMap.length > 0 ? (
            <ul className="space-y-2">
              {project.siteMap.map((entry) => (
                <li key={entry.url} className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{entry.title}</p>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-gray-400 hover:text-indigo-600"
                  >
                    {entry.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No pages gathered.</p>
          )}
        </Tile>

        <Tile className="sm:col-span-2">
          <SectionHeading>Summary &amp; objective</SectionHeading>
          <p className="text-sm leading-relaxed text-gray-600">{project.summary}</p>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-0 overflow-y-auto rounded-2xl bg-gray-50/70 p-5 ring-1 ring-gray-200/70 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{children}</h3>
  );
}
