import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";
import { ThemePanel } from "./theme-panel";
import { parseLayout } from "./widget-types";

/** Sidebar slot inside the configuration editor — a config-specific panel: back
 *  link to Configurations, the config header, and a toggle between the
 *  draggable widget palette and the configuration's theme editor. */
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

  const { config, project } = found;
  const brandColors = project.brandIdentity?.colors ?? [];

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

      <ThemePanel
        configId={configId}
        initialLayout={parseLayout(config.config, brandColors)}
        brandColors={brandColors}
      />
    </div>
  );
}
