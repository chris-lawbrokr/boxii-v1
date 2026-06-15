"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Palette, LayoutList, Trash2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { deleteProjectAction } from "@/app/lib/project-actions";

/** Sidebar for a project: back link, project name, and tab buttons that open
 *  the Brand details / Configurations tabs in the main area. */
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

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate font-semibold text-gray-900">{projectName}</h2>
        <StatusBadge status={status} />
      </div>

      <nav className="flex flex-col gap-1">
        <Tab href={base} active={!onConfigs} icon={<Palette className="h-4 w-4" />} label="Brand details" />
        <Tab
          href={`${base}/configurations`}
          active={onConfigs}
          icon={<LayoutList className="h-4 w-4" />}
          label="Configurations"
        />
      </nav>

      <form action={deleteProjectAction.bind(null, projectId)} className="mt-1">
        <button
          type="submit"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete project
        </button>
      </form>
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
        active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
