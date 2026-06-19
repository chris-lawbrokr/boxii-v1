"use client";

import { Link2, Heading, Type, Image as ImageIcon, Video } from "lucide-react";
import { DND_NEW_WIDGET, DND_SPAN2, widgetSpan, type WidgetType } from "./widget-types";

type PaletteEntry = {
  type: WidgetType;
  label: string;
  icon: typeof Link2;
};

const PALETTE: PaletteEntry[] = [
  { type: "link", label: "Link", icon: Link2 },
  { type: "title", label: "Title", icon: Heading },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "video", label: "Video", icon: Video },
];

/** Draggable widget palette for the config-editor sidebar. Drag an entry onto
 *  a grid cell in the canvas to place it. */
export function WidgetPalette() {
  return (
    <ul className="flex flex-col gap-1.5">
      {PALETTE.map((w) => (
        <li
          key={w.label}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DND_NEW_WIDGET, w.type);
            if (widgetSpan(w.type) === 2) e.dataTransfer.setData(DND_SPAN2, "");
            e.dataTransfer.effectAllowed = "copy";
          }}
          className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2 cursor-grab hover:border-indigo-300 hover:bg-indigo-50/40 active:cursor-grabbing"
        >
          <w.icon className="h-4 w-4 shrink-0 text-indigo-500" />
          <p className="text-sm font-medium text-gray-800">{w.label}</p>
        </li>
      ))}
    </ul>
  );
}
