/** Shared types for the popover builder. The grid is 4×4 (16 cells, 0-15). */

export const GRID_SIZE = 4;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** MIME-ish keys used with the native drag-and-drop dataTransfer. */
export const DND_NEW_WIDGET = "application/x-boxii-widget";
export const DND_MOVE_CELL = "application/x-boxii-move";
/** Marker key (no payload) so dragover can tell a 2-cell widget is in flight —
 *  the dragged value itself is unreadable until drop. */
export const DND_SPAN2 = "application/x-boxii-span-2";

export type LinkWidget = { type: "link"; label: string; url: string };
export type TitleWidget = { type: "title"; label: string; subtitle: string };
export type TextWidget = { type: "text"; text: string };
export type ImageWidget = { type: "image"; url: string; alt: string };
export type VideoWidget = { type: "video"; url: string };

/** Discriminated union of every placeable widget. */
export type Widget = LinkWidget | TitleWidget | TextWidget | ImageWidget | VideoWidget;

export type WidgetType = Widget["type"];

/** Widget types that occupy two grid columns (anchored at their top-left cell). */
const WIDE_WIDGETS: ReadonlySet<WidgetType> = new Set<WidgetType>([
  "title",
  "text",
  "image",
  "video",
]);

/** How many grid columns a widget occupies (anchored at its top-left cell). */
export function widgetSpan(type: WidgetType): number {
  return WIDE_WIDGETS.has(type) ? 2 : 1;
}

export const colOf = (cell: number) => cell % GRID_SIZE;
export const rowOf = (cell: number) => Math.floor(cell / GRID_SIZE);

/** All cells occupied by the given widgets (anchor + any spanned cells). */
export function occupancy(cells: Record<number, Widget>): Set<number> {
  const set = new Set<number>();
  for (const [key, w] of Object.entries(cells)) {
    const anchor = Number(key);
    const span = widgetSpan(w.type);
    for (let i = 0; i < span && colOf(anchor) + i < GRID_SIZE; i++) set.add(anchor + i);
  }
  return set;
}

/** Pick the anchor cell for dropping a span-`s` widget near `target`, nudging
 *  left so it never overflows the row. Returns null if it can't fit. */
export function fitAnchor(
  cells: Record<number, Widget>,
  target: number,
  span: number,
): number | null {
  let anchor = target;
  const overflow = colOf(target) + span - GRID_SIZE;
  if (overflow > 0) anchor = target - overflow;
  if (anchor < 0 || rowOf(anchor) !== rowOf(target)) return null;
  const occ = occupancy(cells);
  for (let i = 0; i < span; i++) {
    if (occ.has(anchor + i)) return null;
  }
  return anchor;
}

/** Re-seat widgets so none overflow the grid or overlap — used when loading
 *  persisted data that may predate the span rules. Processed in index order;
 *  a widget that can't be re-seated anywhere is dropped. */
export function normalizeCells(cells: Record<number, Widget>): Record<number, Widget> {
  const result: Record<number, Widget> = {};
  const ordered = Object.keys(cells)
    .map(Number)
    .sort((a, b) => a - b);

  for (const key of ordered) {
    const w = cells[key];
    const span = widgetSpan(w.type);
    // Prefer the original cell (nudged in-row); else scan for the first slot.
    let anchor = fitAnchor(result, key, span);
    if (anchor === null) {
      for (let c = 0; c < CELL_COUNT; c++) {
        anchor = fitAnchor(result, c, span);
        if (anchor !== null) break;
      }
    }
    if (anchor !== null) result[anchor] = w;
  }
  return result;
}

/** How the popover background is painted. */
export type BgStyle = "solid" | "gradient" | "pattern";

/** Available repeating background patterns (drawn with CSS gradients). */
export type PatternId = "dots" | "grid" | "stripes" | "checks";

export const PATTERNS: PatternId[] = ["dots", "grid", "stripes", "checks"];

/** Per-configuration colour theme. Defaults from the project's brand identity,
 *  but overridable for a specific configuration. */
export type Theme = {
  canvas: string; // popover background — base / first gradient stop
  canvas2: string; // second gradient stop / pattern accent colour
  bgStyle: BgStyle; // how the background is painted
  pattern: PatternId; // which pattern when bgStyle === "pattern"
  button: string; // widget/button fill
  label: string; // widget/button text
};

/** CSS for a pattern: a `canvas` base painted with a repeating `accent` motif. */
function patternCss(pattern: PatternId, base: string, accent: string): string {
  switch (pattern) {
    case "grid":
      return `background-color:${base};background-image:linear-gradient(${accent} 1px,transparent 1px),linear-gradient(90deg,${accent} 1px,transparent 1px);background-size:22px 22px;`;
    case "stripes":
      return `background-color:${base};background-image:repeating-linear-gradient(45deg,${accent} 0,${accent} 2px,transparent 2px,transparent 14px);`;
    case "checks":
      return `background-color:${base};background-image:linear-gradient(45deg,${accent} 25%,transparent 25%,transparent 75%,${accent} 75%),linear-gradient(45deg,${accent} 25%,transparent 25%,transparent 75%,${accent} 75%);background-size:24px 24px;background-position:0 0,12px 12px;`;
    case "dots":
    default:
      return `background-color:${base};background-image:radial-gradient(${accent} 1.6px,transparent 1.6px);background-size:16px 16px;`;
  }
}

/** Build the inline-style declaration(s) that paint a theme's background.
 *  Shared by the live <boxii-popover> element and the editor's preview swatches
 *  so every surface renders the background identically. */
export function backgroundCss(theme: Theme): string {
  switch (theme.bgStyle) {
    case "gradient":
      return `background:linear-gradient(135deg,${theme.canvas},${theme.canvas2});`;
    case "pattern":
      return patternCss(theme.pattern, theme.canvas, theme.canvas2);
    case "solid":
    default:
      return `background:${theme.canvas};`;
  }
}

/** Persisted layout: a map of cell index (0-15) → widget, plus a theme. */
export type Layout = { cells: Record<number, Widget>; theme: Theme };

/** Fallback brand palette when a project hasn't gathered colours. */
const FALLBACK_COLORS = ["#4f46e5", "#0e2a2a", "#ffffff", "#112d2d"];

/** Pick a readable text colour (near-black or white) for a given hex bg. */
export function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // Relative luminance (sRGB, simple coefficients).
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "#ffffff";
}

/** Derive a sensible default theme from a project's brand colours. */
export function defaultTheme(brandColors: string[]): Theme {
  const colors = brandColors.length ? brandColors : FALLBACK_COLORS;
  // Prefer a dark colour for the canvas and a distinct one for the button.
  const sorted = [...colors];
  const dark = pickByLuminance(colors, "dark") ?? colors[0];
  const accent = colors.find((c) => c.toLowerCase() !== dark.toLowerCase()) ?? sorted[1] ?? dark;
  const light = pickByLuminance(colors, "light") ?? "#ffffff";
  return {
    canvas: dark,
    canvas2: light.toLowerCase() === dark.toLowerCase() ? "#ffffff" : light,
    bgStyle: "solid",
    pattern: "dots",
    button: accent,
    label: contrastText(accent),
  };
}

function pickByLuminance(colors: string[], want: "dark" | "light"): string | undefined {
  let best: string | undefined;
  let bestLum = want === "dark" ? Infinity : -Infinity;
  for (const c of colors) {
    const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
    if (!m) continue;
    const int = parseInt(m[1], 16);
    const lum = (0.299 * ((int >> 16) & 255) + 0.587 * ((int >> 8) & 255) + 0.114 * (int & 255)) / 255;
    if ((want === "dark" && lum < bestLum) || (want === "light" && lum > bestLum)) {
      bestLum = lum;
      best = c;
    }
  }
  return best;
}

export function emptyLayout(brandColors: string[] = []): Layout {
  return { cells: {}, theme: defaultTheme(brandColors) };
}

/** Defensively parse the jsonb `config` column into a Layout. */
export function parseLayout(raw: unknown, brandColors: string[] = []): Layout {
  const fallbackTheme = defaultTheme(brandColors);
  if (!raw || typeof raw !== "object") return { cells: {}, theme: fallbackTheme };

  const obj = raw as { cells?: unknown; theme?: unknown };

  const cells: Record<number, Widget> = {};
  if (obj.cells && typeof obj.cells === "object") {
    for (const [key, value] of Object.entries(obj.cells as Record<string, unknown>)) {
      const idx = Number(key);
      if (!Number.isInteger(idx) || idx < 0 || idx >= CELL_COUNT) continue;
      const w = value as {
        type?: string;
        label?: unknown;
        url?: unknown;
        subtitle?: unknown;
        text?: unknown;
        alt?: unknown;
      };
      if (w && w.type === "link") {
        cells[idx] = { type: "link", label: String(w.label ?? ""), url: String(w.url ?? "") };
      } else if (w && w.type === "title") {
        cells[idx] = {
          type: "title",
          label: String(w.label ?? ""),
          subtitle: String(w.subtitle ?? ""),
        };
      } else if (w && w.type === "text") {
        cells[idx] = { type: "text", text: String(w.text ?? "") };
      } else if (w && w.type === "image") {
        cells[idx] = { type: "image", url: String(w.url ?? ""), alt: String(w.alt ?? "") };
      } else if (w && w.type === "video") {
        cells[idx] = { type: "video", url: String(w.url ?? "") };
      }
    }
  }

  const t = (obj.theme ?? {}) as Partial<Theme>;
  const bgStyle: BgStyle =
    t.bgStyle === "gradient" || t.bgStyle === "pattern" ? t.bgStyle : "solid";
  const pattern: PatternId = PATTERNS.includes(t.pattern as PatternId)
    ? (t.pattern as PatternId)
    : "dots";
  const theme: Theme = {
    canvas: typeof t.canvas === "string" ? t.canvas : fallbackTheme.canvas,
    canvas2: typeof t.canvas2 === "string" ? t.canvas2 : fallbackTheme.canvas2,
    bgStyle,
    pattern,
    button: typeof t.button === "string" ? t.button : fallbackTheme.button,
    label: typeof t.label === "string" ? t.label : fallbackTheme.label,
  };

  return { cells: normalizeCells(cells), theme };
}

export function defaultWidget(type: WidgetType): Widget {
  switch (type) {
    case "link":
      return { type: "link", label: "Click here", url: "https://" };
    case "title":
      return { type: "title", label: "Your title", subtitle: "" };
    case "text":
      return { type: "text", text: "Add some text here." };
    case "image":
      return { type: "image", url: "", alt: "" };
    case "video":
      return { type: "video", url: "" };
  }
}

/** Normalise common share URLs (YouTube/Vimeo) into an embeddable iframe src.
 *  Returns the input unchanged when it already looks embeddable or unknown. */
export function embedUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  // youtu.be/<id> or youtube.com/watch?v=<id>
  const yt =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(u);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // vimeo.com/<id>
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return u;
}
