"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link2,
  Heading,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  Type,
  Image as ImageIcon,
  Video,
  ArrowUpRight,
} from "lucide-react";
import { saveConfigLayoutAction } from "@/app/lib/project-actions";
import { PopoverPreview } from "./popover-preview";
import { useConfigStore, updateLayout } from "./config-store";
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
  cssTextToStyle,
  type Layout,
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
  // Layout lives in the shared editor store so the sidebar's theme editor (a
  // separate route slot) and this canvas edit the same source of truth.
  const { layout } = useConfigStore(configId, initialLayout, brandColors);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragCells, setDragCells] = useState<number[]>([]);

  // Debounced persistence — skip the very first render (no change yet).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      void saveConfigLayoutAction(configId, layout as unknown as Record<string, unknown>);
    }, 500);
    return () => clearTimeout(t);
  }, [layout, configId]);

  const placeNew = useCallback((cell: number, type: WidgetType) => {
    updateLayout((prev) => {
      const anchor = fitAnchor(prev.cells, cell, widgetSpan(type));
      if (anchor === null) return prev; // doesn't fit here
      return { ...prev, cells: { ...prev.cells, [anchor]: defaultWidget(type) } };
    });
  }, []);

  const moveWidget = useCallback((from: number, to: number) => {
    if (from === to) return;
    updateLayout((prev) => {
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
      updateLayout((prev) => {
        const existing = prev.cells[cell];
        if (!existing) return prev;
        return { ...prev, cells: { ...prev.cells, [cell]: { ...existing, ...patch } } };
      });
    },
    [],
  );

  const removeWidget = useCallback((cell: number) => {
    updateLayout((prev) => {
      const cells = { ...prev.cells };
      delete cells[cell];
      return { ...prev, cells };
    });
    setSelected((s) => (s === cell ? null : s));
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
