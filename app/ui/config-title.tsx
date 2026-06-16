"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { renameConfigurationAction } from "@/app/lib/project-actions";

/** Editor-page title: the configuration name as a large heading with an inline
 *  rename toggle, plus the status badge. */
export function ConfigTitle({
  configId,
  projectId,
  name,
  status,
}: {
  configId: string;
  projectId: string;
  name: string;
  status: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={renameConfigurationAction.bind(null, configId, projectId)}
        onSubmit={() => setEditing(false)}
        className="flex items-center gap-2"
      >
        <input
          name="name"
          defaultValue={name}
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-2xl font-semibold tracking-tight text-gray-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          aria-label="Save name"
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600"
        >
          <Check className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Cancel rename"
          onClick={() => setEditing(false)}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{name}</h1>
      <StatusBadge status={status} />
      <button
        type="button"
        aria-label="Rename configuration"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
