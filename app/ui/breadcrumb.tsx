"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";

type Item = { id: string; name: string };

/** Header breadcrumb: Home → All projects → All configurations (the last only
 *  while a project is open). Each is a dropdown that lists items. */
export function Breadcrumb({ projects }: { projects: Item[] }) {
  const pathname = usePathname();

  const projectMatch = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
  const currentProjectId =
    projectMatch && projectMatch[1] !== "new" ? projectMatch[1] : null;

  const [fetched, setFetched] = useState<{
    projectId: string;
    items: Item[];
  } | null>(null);
  useEffect(() => {
    if (!currentProjectId) return;
    let cancelled = false;
    fetch(`/api/projects/${currentProjectId}/configurations`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled)
          setFetched({ projectId: currentProjectId, items: d.configs ?? [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

  const configs =
    fetched && fetched.projectId === currentProjectId ? fetched.items : [];

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-1 rounded-md px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      >
        <Home className="h-4 w-4" />
        Home
      </Link>

      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      <Dropdown
        label="All projects"
        allHref="/dashboard"
        emptyLabel="No projects yet"
        items={projects.map((p) => ({
          label: p.name,
          href: `/dashboard/projects/${p.id}`,
        }))}
      />

      {currentProjectId && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
          <Dropdown
            label="All configurations"
            allHref={`/dashboard/projects/${currentProjectId}/configurations`}
            emptyLabel="No configurations yet"
            items={configs.map((c) => ({
              label: c.name,
              href: `/dashboard/projects/${currentProjectId}/configurations/${c.id}`,
            }))}
          />
        </>
      )}
    </nav>
  );
}

function Dropdown({
  label,
  allHref,
  items,
  emptyLabel,
}: {
  label: string;
  allHref: string;
  items: { label: string; href: string }[];
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md px-1.5 font-medium text-gray-900 hover:bg-gray-100"
      >
        {label}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-float">
          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="block border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {label}
          </Link>
          {items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">{emptyLabel}</p>
          ) : (
            items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block truncate px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {it.label}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
