import { notFound } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";
import { ConfigTitle } from "@/app/ui/config-title";

export default async function ConfigEditorPage({
  params,
}: {
  params: Promise<{ id: string; configId: string }>;
}) {
  const { id, configId } = await params;
  const user = await requireUser("/login");
  const found = await getConfigurationForUser(configId, user.id);
  if (!found || found.project.id !== id) notFound();

  const { config, project } = found;

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-start">
        <ConfigTitle
          configId={config.id}
          projectId={project.id}
          name={config.name}
          status={config.status}
        />
      </div>

      {/* Builder canvas — same 9:16 → 16:9 (1920×1080) convention as the auth card */}
      <div className="mt-6 flex min-h-0 flex-1 items-center justify-center">
        <div className="relative mx-auto flex aspect-[1080/1920] w-full max-w-[min(100%,26rem,calc((100dvh_-_12rem)*9/16))] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center min-[1080px]:aspect-[1920/1080] min-[1080px]:max-w-[min(100%,64rem,calc((100dvh_-_12rem)*16/9))]">
          <div>
            <LayoutTemplate className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              Drag-and-drop builder coming soon
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Drag widgets from the panel to design a popover, pre-styled from{" "}
              <span className="font-medium">{project.name}</span>&apos;s gathered brand identity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
