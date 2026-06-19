"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link2,
  Heading,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  Palette,
  Type,
  Image as ImageIcon,
  Video,
  ArrowUpRight,
} from "lucide-react";
import { saveConfigLayoutAction } from "@/app/lib/project-actions";
import { PopoverPreview } from "./popover-preview";
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
  backgroundCss,
  contrastText,
  PATTERNS,
  type BgStyle,
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
      return { ...prev, cells };
    });
  }, []);

  const updateWidget = useCallback(
    (
      cell: number,
      patch: Partial<{ label: string; url: string; subtitle: string; text: string; alt: string }>,
    ) => {
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
  // Readable colour for content sitting directly on the canvas (light text on a
  // dark canvas, dark text on a light one). Drives the frosted-glass card tints.
  const onCanvas = contrastText(theme.canvas);
  const glassBg = `color-mix(in srgb, ${onCanvas} 8%, transparent)`;
  const glassBorder = `color-mix(in srgb, ${onCanvas} 16%, transparent)`;

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

      {/* Preview renders the REAL shippable Lit <boxii-popover> element, so what
          you preview is exactly what the embed ships. Edit mode keeps a React
          grid for drag-and-drop authoring. */}
      {preview ? (
        <PopoverPreview layout={layout} />
      ) : (
        <div
          className="grid h-full w-full gap-2 rounded-3xl border border-black/5 p-3 shadow-float"
          style={{
            ...cssTextToStyle(backgroundCss(theme)),
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
          onClick={() => setSelected(null)}
          onDragLeave={(e) => {
            // Clear only when the cursor actually leaves the grid, not on inner moves.
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragCells([]);
          }}
        >
          {Array.from({ length: CELL_COUNT }, (_, cell) => {
            const widget = layout.cells[cell];
            // Skip cells covered by a spanning widget anchored to their left.
            if (!widget && covered.has(cell)) return null;

            const isOver = dragCells.includes(cell);
            // Clamp so a widget never spills past the last column (safety net).
            const span = Math.min(widget ? widgetSpan(widget.type) : 1, GRID_SIZE - colOf(cell));
            const cellStyle = {
              gridColumn: `${colOf(cell) + 1} / span ${span}`,
              gridRow: `${rowOf(cell) + 1}`,
            };

            return (
              <div
                key={cell}
                onDragOver={onDragOverCell(cell)}
                onDrop={onDropCell(cell)}
                style={
                  widget || isOver
                    ? cellStyle
                    : { ...cellStyle, borderColor: glassBorder }
                }
                className={`rounded-2xl transition ${
                  widget
                    ? ""
                    : isOver
                      ? "border-2 border-dashed border-indigo-300 bg-white/10"
                      : "border border-dashed"
                }`}
              >
                {widget && (
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DND_MOVE_CELL, String(cell));
                      if (widgetSpan(widget.type) === 2) e.dataTransfer.setData(DND_SPAN2, "");
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    style={
                      widget.type === "image" || widget.type === "video"
                        ? { color: onCanvas, borderColor: glassBorder }
                        : { background: glassBg, color: onCanvas, borderColor: glassBorder }
                    }
                    className={`group relative flex h-full w-full cursor-grab flex-col items-start justify-center gap-1 overflow-hidden rounded-2xl border p-3 text-left backdrop-blur-md transition active:cursor-grabbing ${
                      selected === cell ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white" : ""
                    }`}
                  >
                    {/* Edit control — revealed on hover. The edit popup opens only
                        when the user clicks the pencil, not on a plain click of the
                        widget. Deletion lives inside the edit card. */}
                    <div
                      className={`absolute right-1 top-1 z-10 flex gap-1 transition-opacity group-hover:opacity-100 ${
                        selected === cell ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <button
                        type="button"
                        aria-label="Edit widget"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(cell);
                        }}
                        className="rounded-md bg-white/90 p-1 text-gray-600 shadow-sm backdrop-blur hover:bg-white hover:text-indigo-600"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    <WidgetCellBody widget={widget} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {!preview && selected !== null && selectedWidget?.type === "text" && (
        <TextEditor
          key={selected}
          widget={selectedWidget}
          onChange={(patch) => updateWidget(selected, patch)}
          onRemove={() => removeWidget(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {!preview && selected !== null && selectedWidget?.type === "image" && (
        <ImageEditor
          key={selected}
          widget={selectedWidget}
          onChange={(patch) => updateWidget(selected, patch)}
          onRemove={() => removeWidget(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {!preview && selected !== null && selectedWidget?.type === "video" && (
        <VideoEditor
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

/** Renders the contents of a widget inside an editor grid cell. The shipping
 *  popover renders the same widgets via <boxii-popover>; this is the authoring
 *  mirror. */
function WidgetCellBody({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case "link":
      return (
        <div className="flex w-full items-center justify-between gap-2">
          <span className="line-clamp-2 break-words text-sm font-semibold leading-tight">
            {widget.label || "Link"}
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
        </div>
      );
    case "title":
      return (
        <>
          <span className="line-clamp-2 break-words font-serif text-2xl font-semibold leading-tight tracking-tight">
            {widget.label || "Your title"}
          </span>
          {widget.subtitle && (
            <span className="line-clamp-2 break-words text-xs font-normal leading-snug opacity-70">
              {widget.subtitle}
            </span>
          )}
        </>
      );
    case "text":
      return (
        <span className="line-clamp-4 whitespace-pre-wrap break-words text-xs font-normal leading-snug opacity-85">
          {widget.text || "Add some text here."}
        </span>
      );
    case "image":
      return widget.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URL, not a Next asset
        <img
          src={widget.url}
          alt={widget.alt}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <ImageIcon className="h-5 w-5 opacity-70" />
          <span className="text-xs font-medium opacity-70">Image</span>
        </div>
      );
    case "video":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <Video className="h-5 w-5 opacity-70" />
          <span className="line-clamp-1 break-all text-xs font-medium opacity-70">
            {widget.url ? "Video" : "Add a video URL"}
          </span>
        </div>
      );
  }
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
  const bgStyles: { id: BgStyle; label: string }[] = [
    { id: "solid", label: "Solid" },
    { id: "gradient", label: "Gradient" },
    { id: "pattern", label: "Pattern" },
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

      {/* ---- Background ---- */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Background
          </span>
          {/* Live preview of the chosen background */}
          <span
            className="h-6 w-12 rounded-md border border-gray-200"
            style={cssTextToStyle(backgroundCss(theme))}
            aria-hidden
          />
        </div>

        {/* Style toggle: solid / gradient / pattern */}
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-0.5">
          {bgStyles.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ bgStyle: s.id })}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                theme.bgStyle === s.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <ColorRow
          label={theme.bgStyle === "solid" ? "Colour" : "Base"}
          colorKey="canvas"
          theme={theme}
          brandColors={brandColors}
          onChange={onChange}
        />
        {theme.bgStyle !== "solid" && (
          <ColorRow
            label={theme.bgStyle === "gradient" ? "Gradient to" : "Pattern"}
            colorKey="canvas2"
            theme={theme}
            brandColors={brandColors}
            onChange={onChange}
          />
        )}

        {theme.bgStyle === "pattern" && (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PATTERNS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ pattern: p })}
                aria-label={`${p} pattern`}
                title={p}
                style={cssTextToStyle(
                  backgroundCss({ ...theme, bgStyle: "pattern", pattern: p }),
                )}
                className={`h-8 rounded-md border ${
                  theme.pattern === p
                    ? "border-gray-900 ring-1 ring-gray-900"
                    : "border-gray-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Widgets ---- */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Widgets</span>
        <ColorRow
          label="Button"
          colorKey="button"
          theme={theme}
          brandColors={brandColors}
          onChange={onChange}
        />
        <ColorRow
          label="Text"
          colorKey="label"
          theme={theme}
          brandColors={brandColors}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

/** Convert a CSS-text declaration string (e.g. "background:#fff;") into a React
 *  style object so editor swatches reuse the exact same paint as the widget. */
function cssTextToStyle(cssText: string): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const decl of cssText.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop) continue;
    // camelCase the CSS property for React.
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[camel] = value;
  }
  return style as React.CSSProperties;
}

/** A single colour control: hex picker + brand-palette swatches, bound to one
 *  Theme colour key. */
function ColorRow({
  label,
  colorKey,
  theme,
  brandColors,
  onChange,
}: {
  label: string;
  colorKey: "canvas" | "canvas2" | "button" | "label";
  theme: Theme;
  brandColors: string[];
  onChange: (patch: Partial<Theme>) => void;
}) {
  const value = theme[colorKey];
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-gray-400">{value}</span>
          <input
            type="color"
            value={normalizeHex(value)}
            onChange={(e) => onChange({ [colorKey]: e.target.value })}
            className="h-5 w-5 cursor-pointer rounded border border-gray-200 bg-transparent p-0"
            aria-label={`${label} colour`}
          />
        </label>
      </div>
      {brandColors.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {brandColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ [colorKey]: c })}
              aria-label={`Use ${c}`}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded border ${
                value.toLowerCase() === c.toLowerCase()
                  ? "border-gray-900 ring-1 ring-gray-900"
                  : "border-gray-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** <input type=color> needs a #rrggbb value; coerce anything else to black. */
function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : "#000000";
}

/** Small trash icon (sits in an edit card's header beside Done) that asks for
 *  confirmation in a little popover before firing `onRemove`. */
function DeleteWithConfirm({ onRemove }: { onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Delete widget"
        onClick={() => setConfirming((v) => !v)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {confirming && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white p-2 shadow-float">
          <p className="text-xs text-gray-600">Delete this widget?</p>
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TitleEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { label: string; subtitle: string };
  onChange: (patch: Partial<{ label: string; subtitle: string }>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-1/2 z-10 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Heading className="h-3.5 w-3.5" />
          Title
        </h4>
        <div className="flex items-center gap-1">
          <DeleteWithConfirm onRemove={onRemove} />
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
          Title
        </span>
        <input
          value={widget.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Your title"
          autoFocus
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>

      <label className="mt-2 block">
        <span className="text-xs text-gray-500">Subtitle</span>
        <input
          value={widget.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="Optional subtitle"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
    </div>
  );
}

/** Shared chrome for an edit card: centered popover with a titled header that
 *  carries the delete-with-confirm icon and a Done button. */
function EditorCard({
  title,
  icon: Icon,
  onRemove,
  onClose,
  children,
}: {
  title: string;
  icon: typeof Heading;
  onRemove: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-1/2 top-1/2 z-10 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h4>
        <div className="flex items-center gap-1">
          <DeleteWithConfirm onRemove={onRemove} />
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
      {children}
    </div>
  );
}

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20";

function TextEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { text: string };
  onChange: (patch: { text: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <EditorCard title="Text" icon={Type} onRemove={onRemove} onClose={onClose}>
      <label className="mt-2 block">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Pencil className="h-3 w-3" />
          Body text
        </span>
        <textarea
          value={widget.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Add some text here."
          rows={3}
          autoFocus
          className={`${FIELD_CLASS} resize-none`}
        />
      </label>
    </EditorCard>
  );
}

function ImageEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { url: string; alt: string };
  onChange: (patch: Partial<{ url: string; alt: string }>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <EditorCard title="Image" icon={ImageIcon} onRemove={onRemove} onClose={onClose}>
      <label className="mt-2 block">
        <span className="text-xs text-gray-500">Image URL</span>
        <input
          value={widget.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/photo.jpg"
          inputMode="url"
          autoFocus
          className={FIELD_CLASS}
        />
      </label>

      <label className="mt-2 block">
        <span className="text-xs text-gray-500">Alt text</span>
        <input
          value={widget.alt}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Describe the image"
          className={FIELD_CLASS}
        />
      </label>

      {widget.url && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URL, not a Next asset
        <img
          src={widget.url}
          alt={widget.alt}
          className="mt-2 h-24 w-full rounded-lg border border-gray-200 object-cover"
        />
      )}
    </EditorCard>
  );
}

function VideoEditor({
  widget,
  onChange,
  onRemove,
  onClose,
}: {
  widget: { url: string };
  onChange: (patch: { url: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <EditorCard title="Video" icon={Video} onRemove={onRemove} onClose={onClose}>
      <label className="mt-2 block">
        <span className="text-xs text-gray-500">Video URL</span>
        <input
          value={widget.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://youtube.com/watch?v=…"
          inputMode="url"
          autoFocus
          className={FIELD_CLASS}
        />
      </label>
      <p className="mt-1.5 text-xs text-gray-400">
        Paste a YouTube or Vimeo link — it&apos;s embedded automatically.
      </p>
    </EditorCard>
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
    <div className="absolute left-1/2 top-1/2 z-10 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-float">
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
          <DeleteWithConfirm onRemove={onRemove} />
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
