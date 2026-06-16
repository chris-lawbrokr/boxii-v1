"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Palette, LayoutList, Trash2, Settings } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { deleteProjectAction } from "@/app/lib/project-actions";

/** Sidebar for a project: back link, project name, and tab buttons that open
 *  the Brand details / Configurations tabs in the main area. A Settings
 *  section pinned to the bottom holds the (confirmed) delete action. */
export function ProjectNav({
  projectId,
  projectName,
  status,
}: {
  projectId: string;
  projectName: string;
  status: string;
}) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;
  const onConfigs = pathname.startsWith(`${base}/configurations`);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate font-semibold text-gray-900">
          {projectName}
        </h2>
        <StatusBadge status={status} />
      </div>

      <nav className="flex flex-col gap-1">
        <Tab
          href={base}
          active={!onConfigs}
          icon={<Palette className="h-4 w-4" />}
          label="Brand details"
        />
        <Tab
          href={`${base}/configurations`}
          active={onConfigs}
          icon={<LayoutList className="h-4 w-4" />}
          label="Configurations"
        />
      </nav>

      <div className="relative mt-auto pt-3">
        {settingsOpen && (
          <>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => {
                setSettingsOpen(false);
                setConfirmDelete(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-float">
              <h3 className="text-sm font-medium text-gray-900">Danger zone</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Permanently delete this project and all of its configurations.
              </p>

              {confirmDelete ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                  <p className="text-sm font-medium text-red-700">
                    Are you sure?
                  </p>
                  <p className="mt-0.5 text-xs text-red-600">
                    This can&apos;t be undone.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <form action={deleteProjectAction.bind(null, projectId)}>
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete project
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete project
                </button>
              )}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          className="relative z-50 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </div>
  );
}

function Tab({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
