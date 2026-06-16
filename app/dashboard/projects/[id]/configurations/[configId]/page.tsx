import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";
import { ConfigTitle } from "@/app/ui/config-title";
import { ConfigCanvas } from "@/app/ui/config-canvas";
import { parseLayout } from "@/app/ui/widget-types";

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
  const brandColors = project.brandIdentity?.colors ?? [];

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
      <div className="mt-10 flex min-h-0 flex-1 items-center justify-center">
        <div className="relative mx-auto aspect-[1080/1920] w-full max-w-[min(100%,26rem,calc((100dvh_-_12rem)*9/16))] min-[1080px]:aspect-[1920/1080] min-[1080px]:max-w-[min(100%,64rem,calc((100dvh_-_12rem)*16/9))]">
          <ConfigCanvas
            configId={config.id}
            initialLayout={parseLayout(config.config, brandColors)}
            brandColors={brandColors}
          />
        </div>
      </div>
    </div>
  );
}
