import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/dal";
import { getProject } from "@/app/lib/db/projects";
import { listConfigurations } from "@/app/lib/db/configurations";

/** Configurations for a project (id + name), used by the header breadcrumb. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ configs: [] }, { status: 401 });

  const { id } = await params;
  const project = await getProject(id, user.id);
  if (!project) return NextResponse.json({ configs: [] }, { status: 404 });

  const configs = await listConfigurations(id);
  return NextResponse.json({ configs: configs.map((c) => ({ id: c.id, name: c.name })) });
}
