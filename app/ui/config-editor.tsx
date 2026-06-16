"use client";

import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { ConfigTitle } from "./config-title";
import { ConfigCanvas } from "./config-canvas";
import type { Layout } from "./widget-types";

/** Client shell for the configuration editor: header row (editable title +
 *  Preview/Edit toggle) over the drag-and-drop canvas. Owns preview state so
 *  the header toggle can drive the canvas. */
export function ConfigEditor({
  configId,
  projectId,
  name,
  status,
  brandColors,
  initialLayout,
}: {
  configId: string;
  projectId: string;
  name: string;
  status: string;
  brandColors: string[];
  initialLayout: Layout;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <ConfigTitle configId={configId} projectId={projectId} name={name} status={status} />
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Builder canvas — same 9:16 → 16:9 (1920×1080) convention as the auth card */}
      <div className="mt-10 flex min-h-0 flex-1 items-center justify-center">
        <div className="relative mx-auto aspect-[1080/1920] w-full max-w-[min(100%,26rem,calc((100dvh_-_12rem)*9/16))] min-[1080px]:aspect-[1920/1080] min-[1080px]:max-w-[min(100%,64rem,calc((100dvh_-_12rem)*16/9))]">
          <ConfigCanvas
            configId={configId}
            initialLayout={initialLayout}
            brandColors={brandColors}
            preview={preview}
          />
        </div>
      </div>
    </div>
  );
}
