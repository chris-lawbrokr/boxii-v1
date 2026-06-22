"use client";

import { useState } from "react";
import { Palette, LayoutGrid } from "lucide-react";
import { useConfigStore, updateTheme } from "./config-store";
import { WidgetPalette } from "./widget-palette";
import {
  backgroundCss,
  cssTextToStyle,
  PATTERNS,
  type BgStyle,
  type Layout,
  type Theme,
} from "./widget-types";

type Tab = "widgets" | "theme";

/** Configuration-editor sidebar body. A segmented toggle switches between the
 *  draggable widget list and the theme editor; the theme writes to the shared
 *  editor store so the canvas (a separate route slot) repaints and saves. */
export function ThemePanel({
  configId,
  initialLayout,
  brandColors,
}: {
  configId: string;
  initialLayout: Layout;
  brandColors: string[];
}) {
  const [tab, setTab] = useState<Tab>("widgets");
  const { layout } = useConfigStore(configId, initialLayout, brandColors);

  const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
    { id: "widgets", label: "Widgets", icon: LayoutGrid },
    { id: "theme", label: "Theme", icon: Palette },
  ];

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "widgets" ? (
        <WidgetPalette />
      ) : (
        <ThemeEditor theme={layout.theme} brandColors={brandColors} onChange={updateTheme} />
      )}
    </div>
  );
}

function ThemeEditor({
  theme,
  brandColors,
  onChange,
}: {
  theme: Theme;
  brandColors: string[];
  onChange: (patch: Partial<Theme>) => void;
}) {
  const bgStyles: { id: BgStyle; label: string }[] = [
    { id: "solid", label: "Solid" },
    { id: "gradient", label: "Gradient" },
    { id: "pattern", label: "Pattern" },
  ];

  return (
    <div>
      <p className="text-xs text-gray-400">Defaults to this site&apos;s brand colours.</p>

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
                style={cssTextToStyle(backgroundCss({ ...theme, bgStyle: "pattern", pattern: p }))}
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
