"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, Heading, Pencil, Trash2, Check, ExternalLink, Palette } from "lucide-react";
import { saveConfigLayoutAction } from "@/app/lib/project-actions";
import {
  CELL_COUNT,
  DND_MOVE_CELL,
  DND_NEW_WIDGET,
  DND_SPAN2,
  GRID_SIZE,
  colOf,
  rowOf,
  fitAnchor,
  defaultWidget,
  widgetSpan,
  type Layout,
  type Theme,
  type Widget,
  type WidgetType,
} from "./widget-types";

/** Interactive popover builder: a 4×4 grid you drag widgets onto. Widgets fill
 *  their cell and use the configuration's brand-derived theme. Layout + theme
 *  auto-save (debounced) to the configuration's `config` column. */
export function ConfigCanvas({
  configId,
  initialLayout,
  brandColors,
  preview,
}: {
  configId: string;
  initialLayout: Layout;
  brandColors: string[];
  preview: boolean;
}) {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragCells, setDragCells] = useState<number[]>([]);
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
      const anchor = fitAnchor(prev.cells, cell, widgetSpan(type));
      if (anchor === null) return prev; // doesn't fit here
      setTimeout(() => setSelected(anchor), 0);
      return { ...prev, cells: { ...prev.cells, [anchor]: defaultWidget(type) } };
    });
  }, []);

  const moveWidget = useCallback((from: number, to: number) => {
    if (from === to) return;
    setLayout((prev) => {
      const moving = prev.cells[from];
      if (!moving) return prev;
      const cells = { ...prev.cells };
      delete cells[from];
      const anchor = fitAnchor(cells, to, widgetSpan(moving.type));
      if (anchor === null) return prev; // no room — leave it where it was
      cells[anchor] = moving;
      setTimeout(() => setSelected(anchor), 0);
      return { ...prev, cells };
    });
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

  // Which cells a drop over `target` would occupy, given the in-flight span.
  // The span is read from the dataTransfer *types* (the value is unreadable
  // until drop), so a 2-cell widget previews both cells on hover.
  const previewCells = (target: number, span: number): number[] => {
    let anchor = target;
    const overflow = colOf(target) + span - GRID_SIZE;
    if (overflow > 0) anchor = target - overflow;
    if (anchor < 0 || rowOf(anchor) !== rowOf(target)) return [target];
    return Array.from({ length: span }, (_, i) => anchor + i);
  };

  const onDragOverCell = (cell: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const span = e.dataTransfer.types.includes(DND_SPAN2) ? 2 : 1;
    setDragCells(previewCells(cell, span));
  };

  const onDropCell = (cell: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragCells([]);
    const newType = e.dataTransfer.getData(DND_NEW_WIDGET);
    const moveFrom = e.dataTransfer.getData(DND_MOVE_CELL);
    if (newType) placeNew(cell, newType as WidgetType);
    else if (moveFrom) moveWidget(Number(moveFrom), cell);
  };

  const { theme } = layout;

  // Cells hidden because a spanning widget to their left covers them.
  const covered = new Set<number>();
  for (const [key, w] of Object.entries(layout.cells)) {
    const anchor = Number(key);
    for (let i = 1; i < widgetSpan(w.type); i++) {
      if (colOf(anchor) + i < GRID_SIZE) covered.add(anchor + i);
    }
  }

  const selectedWidget = selected !== null ? layout.cells[selected] : undefined;

  return (
    <div className="relative h-full w-full">
      {/* Toolbar above the canvas */}
      <div className="absolute -top-8 left-0 right-0 flex items-center justify-between">
        {preview ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={() => setThemeOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Palette className="h-3.5 w-3.5" />
            Theme
          </button>
        )}
        {!preview && <span className="text-xs text-gray-400">{saving ? "Saving…" : "Saved"}</span>}
      </div>

      {!preview && themeOpen && (
        <ThemeEditor
          theme={theme}
          brandColors={brandColors}
          onChange={updateTheme}
          onClose={() => setThemeOpen(false)}
        />
      )}

      {/* The popover canvas — white background; brand colours live on the widgets */}
      <div
        className={`grid h-full w-full gap-2 rounded-2xl bg-white p-3 ${
          preview ? "border border-gray-200 shadow-float" : "border-2 border-dashed border-gray-300"
        }`}
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
        onClick={() => !preview && setSelected(null)}
        onDragLeave={(e) => {
          // Clear only when the cursor actually leaves the grid, not on inner moves.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragCells([]);
        }}
      >
        {Array.from({ length: CELL_COUNT }, (_, cell) => {
          const widget = layout.cells[cell];
          // Skip cells covered by a spanning widget anchored to their left.
          if (!widget && covered.has(cell)) return null;
          // In preview, empty cells render nothing at all.
          if (preview && !widget) return null;

          const isOver = dragCells.includes(cell);
          // Clamp so a widget never spills past the last column (safety net).
          const span = Math.min(widget ? widgetSpan(widget.type) : 1, GRID_SIZE - colOf(cell));
          const cellStyle = {
            gridColumn: `${colOf(cell) + 1} / span ${span}`,
            gridRow: `${rowOf(cell) + 1}`,
          };

          if (preview && widget) {
            return (
              <PreviewWidget
                key={cell}
                widget={widget}
                button={theme.button}
                label={theme.label}
                style={cellStyle}
              />
            );
          }

          return (
            <div
              key={cell}
              onDragOver={onDragOverCell(cell)}
              onDrop={onDropCell(cell)}
              style={cellStyle}
              className={`rounded-xl transition ${
                widget
                  ? ""
                  : isOver
                    ? "border-2 border-dashed border-indigo-400 bg-indigo-50"
                    : "border border-dashed border-gray-200"
              }`}
            >
              {widget && (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_MOVE_CELL, String(cell));
                    if (widgetSpan(widget.type) === 2) e.dataTransfer.setData(DND_SPAN2, "");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(cell);
                  }}
                  style={{ backgroundColor: theme.button, color: theme.label }}
                  className={`flex h-full w-full cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center shadow-sm active:cursor-grabbing ${
                    selected === cell ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white" : ""
                  } ${widget.type === "title" ? "text-xl font-bold" : "text-sm font-semibold"}`}
                >
                  {widget.type === "link" ? (
                    <>
                      <Link2 className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="line-clamp-2 break-words leading-tight">
                        {widget.label || "Link"}
                      </span>
                    </>
                  ) : (
                    <span className="line-clamp-2 break-words leading-tight">
                      {widget.label || "Your title"}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!preview && selected !== null && selectedWidget?.type === "link" && (
        <LinkEditor
          key={selected}
          widget={selectedWidget}
          onChange={(patch) => updateWidget(selected, patch)}
          onRemove={() => removeWidget(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {!preview && selected !== null && selectedWidget?.type === "title" && (
        <TitleEditor
          key={selected}
          widget={selectedWidget}
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
    { key: "button", label: "Button" },
    { key: "label", label: "Text" },
  ];

  return (
    <div className="absolute left-0 top-1 z-20 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
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

/** A widget as it appears in the live popover (preview mode) — links are real,
 *  clickable anchors; titles are plain headings. No edit affordances. */
function PreviewWidget({
  widget,
  button,
  label,
  style,
}: {
  widget: Widget;
  button: string;
  label: string;
  style: React.CSSProperties;
}) {
  if (widget.type === "link") {
    return (
      <a
        href={widget.url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...style, backgroundColor: button, color: label }}
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center text-sm font-semibold shadow-sm transition hover:opacity-90"
      >
        <Link2 className="h-4 w-4 shrink-0 opacity-80" />
        <span className="line-clamp-2 break-words leading-tight">{widget.label || "Link"}</span>
      </a>
    );
  }
  return (
    <div
      style={{ ...style, backgroundColor: button, color: label }}
      className="flex h-full w-full items-center justify-center rounded-xl p-2 text-center text-xl font-bold shadow-sm"
    >
      <span className="line-clamp-2 break-words leading-tight">{widget.label || "Your title"}</span>
    </div>
  );
}

/** <input type=color> needs a #rrggbb value; coerce anything else to black. */
function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : "#000000";
}

function TitleEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { label: string };
  onChange: (patch: { label: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-2 z-10 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Heading className="h-3.5 w-3.5" />
          Title
        </h4>
        <div className="flex items-center gap-1">
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
          Title text
        </span>
        <input
          value={widget.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Your title"
          autoFocus
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
    </div>
  );
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
