/** Shared types for the popover builder. The grid is 4×4 (16 cells, 0-15). */

export const GRID_SIZE = 4;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** MIME-ish keys used with the native drag-and-drop dataTransfer. */
export const DND_NEW_WIDGET = "application/x-boxii-widget";
export const DND_MOVE_CELL = "application/x-boxii-move";

export type LinkWidget = { type: "link"; label: string; url: string };

/** Discriminated union — only Link exists today; more widgets land here. */
export type Widget = LinkWidget;

export type WidgetType = Widget["type"];

/** Per-configuration colour theme. Defaults from the project's brand identity,
 *  but overridable for a specific configuration. */
export type Theme = {
  canvas: string; // popover background
  button: string; // widget/button fill
  label: string; // widget/button text
};

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
  return { canvas: dark, button: accent, label: contrastText(accent) };
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
      const w = value as Partial<LinkWidget>;
      if (w && w.type === "link") {
        cells[idx] = { type: "link", label: String(w.label ?? ""), url: String(w.url ?? "") };
      }
    }
  }

  const t = (obj.theme ?? {}) as Partial<Theme>;
  const theme: Theme = {
    canvas: typeof t.canvas === "string" ? t.canvas : fallbackTheme.canvas,
    button: typeof t.button === "string" ? t.button : fallbackTheme.button,
    label: typeof t.label === "string" ? t.label : fallbackTheme.label,
  };

  return { cells, theme };
}

export function defaultWidget(type: WidgetType): Widget {
  switch (type) {
    case "link":
      return { type: "link", label: "Click here", url: "https://" };
  }
}
