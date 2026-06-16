import { ConfigSidebar } from "@/app/ui/config-sidebar";

// Config editor — sidebar becomes a configuration-specific panel (widget details).
export default async function SidebarConfigSlot({
  params,
}: {
  params: Promise<{ id: string; configId: string }>;
}) {
  const { id, configId } = await params;
  return <ConfigSidebar id={id} configId={configId} />;
}
