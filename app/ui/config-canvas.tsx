"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Pencil, Trash2, Check, ExternalLink, Palette } from "lucide-react";
import { saveConfigLayoutAction } from "@/app/lib/project-actions";
import {
  CELL_COUNT,
  DND_MOVE_CELL,
  DND_NEW_WIDGET,
  GRID_SIZE,
  defaultWidget,
  type Layout,
  type Theme,
  type WidgetType,
} from "./widget-types";

/** Interactive popover builder: a 4×4 grid you drag widgets onto. Widgets fill
 *  their cell and use the configuration's brand-derived theme. Layout + theme
 *  auto-save (debounced) to the configuration's `config` column. */
export function ConfigCanvas({
  configId,
  initialLayout,
  brandColors,
}: {
  configId: string;
  initialLayout: Layout;
  brandColors: string[];
}) {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced persistence — skip the very first render (no change yet).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(async () => {
      await saveConfigLayoutAction(configId, layout as unknown as Record<string, unknown>);
      setSaving(false);
    }, 500);
    return () => clearTimeout(t);
  }, [layout, configId]);

  const placeNew = useCallback((cell: number, type: WidgetType) => {
    setLayout((prev) => {
      if (prev.cells[cell]) return prev; // don't overwrite an occupied cell
      return { ...prev, cells: { ...prev.cells, [cell]: defaultWidget(type) } };
    });
    setSelected(cell);
  }, []);

  const moveWidget = useCallback((from: number, to: number) => {
    if (from === to) return;
    setLayout((prev) => {
      const cells = { ...prev.cells };
      const moving = cells[from];
      if (!moving) return prev;
      const occupant = cells[to];
      cells[to] = moving;
      if (occupant) cells[from] = occupant; // swap
      else delete cells[from];
      return { ...prev, cells };
    });
    setSelected(to);
  }, []);

  const updateWidget = useCallback(
    (cell: number, patch: Partial<{ label: string; url: string }>) => {
      setLayout((prev) => {
        const existing = prev.cells[cell];
        if (!existing) return prev;
        return { ...prev, cells: { ...prev.cells, [cell]: { ...existing, ...patch } } };
      });
    },
    [],
  );

  const removeWidget = useCallback((cell: number) => {
    setLayout((prev) => {
      const cells = { ...prev.cells };
      delete cells[cell];
      return { ...prev, cells };
    });
    setSelected((s) => (s === cell ? null : s));
  }, []);

  const updateTheme = useCallback((patch: Partial<Theme>) => {
    setLayout((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }));
  }, []);

  const onDropCell = (cell: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const newType = e.dataTransfer.getData(DND_NEW_WIDGET);
    const moveFrom = e.dataTransfer.getData(DND_MOVE_CELL);
    if (newType) placeNew(cell, newType as WidgetType);
    else if (moveFrom) moveWidget(Number(moveFrom), cell);
  };

  const { theme } = layout;

  return (
    <div className="relative h-full w-full">
      {/* Toolbar above the canvas */}
      <div className="absolute -top-8 left-0 right-0 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setThemeOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Palette className="h-3.5 w-3.5" />
          Theme
        </button>
        <span className="text-xs text-gray-400">{saving ? "Saving…" : "Saved"}</span>
      </div>

      {themeOpen && (
        <ThemeEditor
          theme={theme}
          brandColors={brandColors}
          onChange={updateTheme}
          onClose={() => setThemeOpen(false)}
        />
      )}

      {/* The popover canvas — background uses the theme */}
      <div
        className="grid h-full w-full gap-2 rounded-2xl p-3"
        style={{
          backgroundColor: theme.canvas,
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
        onClick={() => setSelected(null)}
      >
        {Array.from({ length: CELL_COUNT }, (_, cell) => {
          const widget = layout.cells[cell];
          const isOver = dragOver === cell;
          return (
            <div
              key={cell}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(cell);
              }}
              onDragLeave={() => setDragOver((c) => (c === cell ? null : c))}
              onDrop={onDropCell(cell)}
              className={`rounded-xl transition ${
                widget
                  ? ""
                  : isOver
                    ? "border-2 border-dashed border-white/70 bg-white/10"
                    : "border border-dashed border-white/15"
              }`}
            >
              {widget && widget.type === "link" && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_MOVE_CELL, String(cell));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(cell);
                  }}
                  style={{ backgroundColor: theme.button, color: theme.label }}
                  className={`flex h-full w-full cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center text-sm font-semibold shadow-sm active:cursor-grabbing ${
                    selected === cell ? "ring-2 ring-white ring-offset-2 ring-offset-black/20" : ""
                  }`}
                >
                  <Link2 className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="line-clamp-2 break-words leading-tight">
                    {widget.label || "Link"}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected !== null && layout.cells[selected]?.type === "link" && (
        <LinkEditor
          key={selected}
          widget={layout.cells[selected] as { label: string; url: string }}
          onChange={(patch) => updateWidget(selected, patch)}
          onRemove={() => removeWidget(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ThemeEditor({
  theme,
  brandColors,
  onChange,
  onClose,
}: {
  theme: Theme;
  brandColors: string[];
  onChange: (patch: Partial<Theme>) => void;
  onClose: () => void;
}) {
  const rows: { key: keyof Theme; label: string }[] = [
    { key: "canvas", label: "Background" },
    { key: "button", label: "Button" },
    { key: "label", label: "Text" },
  ];

  return (
    <div className="absolute -top-2 left-0 z-20 w-72 -translate-y-full rounded-xl border border-gray-200 bg-white p-3 shadow-float">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Palette className="h-3.5 w-3.5" />
          Configuration theme
        </h4>
        <button
          type="button"
          aria-label="Done"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">Defaults to this site&apos;s brand colours.</p>

      {rows.map((row) => (
        <div key={row.key} className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">{row.label}</span>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-gray-400">{theme[row.key]}</span>
              <input
                type="color"
                value={normalizeHex(theme[row.key])}
                onChange={(e) => onChange({ [row.key]: e.target.value } as Partial<Theme>)}
                className="h-5 w-5 cursor-pointer rounded border border-gray-200 bg-transparent p-0"
                aria-label={`${row.label} colour`}
              />
            </label>
          </div>
          {brandColors.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {brandColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ [row.key]: c } as Partial<Theme>)}
                  aria-label={`Use ${c}`}
                  style={{ backgroundColor: c }}
                  className={`h-5 w-5 rounded border ${
                    theme[row.key].toLowerCase() === c.toLowerCase()
                      ? "border-gray-900 ring-1 ring-gray-900"
                      : "border-gray-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** <input type=color> needs a #rrggbb value; coerce anything else to black. */
function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : "#000000";
}

function LinkEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { label: string; url: string };
  onChange: (patch: Partial<{ label: string; url: string }>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-2 z-10 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Link2 className="h-3.5 w-3.5" />
          Link
        </h4>
        <div className="flex items-center gap-1">
          {widget.url && (
            <a
              href={widget.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open link"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            aria-label="Delete widget"
            onClick={onRemove}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Done"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <label className="mt-2 block">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Pencil className="h-3 w-3" />
          Label
        </span>
        <input
          value={widget.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Click here"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>

      <label className="mt-2 block">
        <span className="text-xs text-gray-500">URL</span>
        <input
          value={widget.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com"
          inputMode="url"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
    </div>
  );
}
