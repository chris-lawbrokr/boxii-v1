import { notFound } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { getConfigurationForUser } from "@/app/lib/db/configurations";
import { ConfigEditor } from "@/app/ui/config-editor";
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
    <ConfigEditor
      configId={config.id}
      projectId={project.id}
      name={config.name}
      brandColors={brandColors}
      initialLayout={parseLayout(config.config, brandColors)}
    />
  );
}
