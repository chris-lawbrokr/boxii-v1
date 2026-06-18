import { NextResponse } from "next/server";
import { getPublishedConfiguration } from "@/app/lib/db/configurations";
import { parseLayout } from "@/app/ui/widget-types";

/**
 * Public embed endpoint. A host site's loader (see app/widget/loader.ts) fetches
 * `/api/embed/<configId>` to get the layout that drives <boxii-popover>. Only
 * PUBLISHED configurations are served; drafts 404. CORS is open because the
 * widget is designed to be embedded on arbitrary third-party origins.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_req: Request, { params }: { params: Promise<{ configId: string }> }) {
  const { configId } = await params;
  const found = await getPublishedConfiguration(configId);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }

  const brandColors = found.project.brandIdentity?.colors ?? [];
  const layout = parseLayout(found.config.config, brandColors);

  return NextResponse.json(
    { id: found.config.id, name: found.config.name, layout },
    {
      headers: {
        ...CORS,
        // Short cache; published layouts change rarely but should propagate.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
