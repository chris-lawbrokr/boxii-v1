import Link from "next/link";
import {
  ArrowLeft,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  TextCursorInput,
  StretchHorizontal,
} from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";

const WIDGETS = [
  { label: "Text", icon: Type, hint: "Headings & body copy" },
  { label: "Image", icon: ImageIcon, hint: "Logo or hero visual" },
  { label: "Button", icon: MousePointerClick, hint: "Call to action" },
  { label: "Form", icon: TextCursorInput, hint: "Capture input" },
  { label: "Spacer", icon: StretchHorizontal, hint: "Vertical gap" },
];

/** Sidebar slot inside the configuration editor — a config-specific panel: back
 *  link to Configurations, the config header, and the widget palette/details. */
export async function ConfigSidebar({ id, configId }: { id: string; configId: string }) {
  const user = await requireUser("/login");
  const found = await getConfigurationForUser(configId, user.id);

  const backHref = `/dashboard/projects/${id}/configurations`;

  if (!found || found.project.id !== id) {
    return (
      <div className="text-sm text-gray-500">
        <Link href={backHref} className="flex w-fit items-center gap-1 text-xs hover:text-gray-700">
          <ArrowLeft className="h-3.5 w-3.5" />
          Configurations
        </Link>
        <p className="mt-3">Configuration not found.</p>
      </div>
    );
  }

  const { config } = found;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate font-semibold text-gray-900">{config.name}</h2>
        <Link
          href={backHref}
          className="ml-auto flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Widgets
        </h3>
        <ul className="flex flex-col gap-1.5">
          {WIDGETS.map((w) => (
            <li
              key={w.label}
              className="flex cursor-not-allowed items-start gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-2"
            >
              <w.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600">{w.label}</p>
                <p className="truncate text-xs text-gray-400">{w.hint}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-xs text-gray-400">
          Drag-and-drop builder coming soon.
        </p>
      </div>
    </div>
  );
}
