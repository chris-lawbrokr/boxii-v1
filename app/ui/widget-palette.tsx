"use client";

import {
  Link2,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  TextCursorInput,
  StretchHorizontal,
} from "lucide-react";
import { DND_NEW_WIDGET, type WidgetType } from "./widget-types";

type PaletteEntry = {
  type: WidgetType | null; // null = not draggable yet
  label: string;
  icon: typeof Link2;
  hint: string;
};

const PALETTE: PaletteEntry[] = [
  { type: "link", label: "Link", icon: Link2, hint: "Button with a clickable link" },
  { type: null, label: "Text", icon: Type, hint: "Headings & body copy" },
  { type: null, label: "Image", icon: ImageIcon, hint: "Logo or hero visual" },
  { type: null, label: "Button", icon: MousePointerClick, hint: "Call to action" },
  { type: null, label: "Form", icon: TextCursorInput, hint: "Capture input" },
  { type: null, label: "Spacer", icon: StretchHorizontal, hint: "Vertical gap" },
];

/** Draggable widget palette for the config-editor sidebar. Drag an enabled
 *  entry onto a grid cell in the canvas to place it. */
export function WidgetPalette() {
  return (
    <ul className="flex flex-col gap-1.5">
      {PALETTE.map((w) => {
        const enabled = w.type !== null;
        return (
          <li
            key={w.label}
            draggable={enabled}
            onDragStart={(e) => {
              if (!w.type) return;
              e.dataTransfer.setData(DND_NEW_WIDGET, w.type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
              enabled
                ? "cursor-grab border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 active:cursor-grabbing"
                : "cursor-not-allowed border-dashed border-gray-300"
            }`}
          >
            <w.icon className={`mt-0.5 h-4 w-4 shrink-0 ${enabled ? "text-indigo-500" : "text-gray-400"}`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${enabled ? "text-gray-800" : "text-gray-600"}`}>
                {w.label}
              </p>
              <p className="truncate text-xs text-gray-400">{w.hint}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
