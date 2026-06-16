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
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate font-semibold text-gray-900">{projectName}</h2>
        <StatusBadge status={status} />
        <Link
          href="/dashboard"
          className="ml-auto flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
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
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-float">
              <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                Settings
              </p>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  setConfirmDelete(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={settingsOpen}
          className="relative z-50 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete project"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirmDelete(false)}
            className="absolute inset-0 cursor-default bg-gray-900/40 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-6 shadow-float">
            <h3 className="text-base font-semibold text-gray-900">Delete project?</h3>
            <p className="mt-1 text-sm text-gray-500">
              This permanently deletes <span className="font-medium text-gray-700">{projectName}</span>{" "}
              and all of its configurations. This can&apos;t be undone.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <form action={deleteProjectAction.bind(null, projectId)}>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete project
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
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
