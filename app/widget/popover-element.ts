/**
 * <boxii-popover> — the real, shippable popover, built with Lit + Shadow DOM.
 * --------------------------------------------------------------------------
 * This is the SINGLE source of truth for how a configuration's popover looks
 * and behaves. The dashboard editor renders this exact element in preview mode
 * (so "preview" === "what ships"), and the host-site embed (see loader.ts)
 * renders the very same element. Nothing about the popover is reimplemented in
 * React — the React side only drags/drops to author the `layout`.
 *
 * It takes one input, the `layout` property: a 4×4 grid of widgets plus a
 * colour theme (see widget-types.ts). Everything renders into a Shadow Root, so
 * the host page's CSS can't leak in and ours can't leak out.
 *
 * Written WITHOUT Lit decorators on purpose: the dashboard is bundled by
 * Next.js/SWC, which doesn't enable the legacy decorator transform. The plain
 * `static properties` + `customElements.define` form needs no compiler config
 * and works identically in the standalone embed bundle.
 */

import { LitElement, html, svg, css, nothing, type PropertyValues } from "lit";
import {
  CELL_COUNT,
  GRID_SIZE,
  colOf,
  rowOf,
  widgetSpan,
  emptyLayout,
  parseLayout,
  backgroundCss,
  type Layout,
  type Widget,
} from "../ui/widget-types";

export class BoxiiPopover extends LitElement {
  /** The authored configuration. `attribute: false` — set it as a JS property
   *  (`el.layout = {...}`). For the embed we also accept a JSON string via the
   *  `layout-json` attribute (handy for static host markup). */
  static properties = {
    layout: { attribute: false },
    layoutJson: { attribute: "layout-json", type: String },
  };

  declare layout: Layout;
  declare layoutJson: string | null;

  constructor() {
    super();
    this.layout = emptyLayout();
    this.layoutJson = null;
  }

  willUpdate(changed: PropertyValues<this>) {
    // Allow `<boxii-popover layout-json='{...}'>` as an alternative to the
    // property — parse it into a real Layout when it changes.
    if (changed.has("layoutJson") && this.layoutJson) {
      try {
        this.layout = parseLayout(JSON.parse(this.layoutJson));
      } catch {
        /* leave the existing layout in place on bad JSON */
      }
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      font-family:
        ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica,
        Arial, sans-serif;
    }
    * {
      box-sizing: border-box;
    }

    .canvas {
      display: grid;
      height: 100%;
      width: 100%;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 1rem;
      border: 1px solid rgba(16, 24, 40, 0.1);
      box-shadow:
        0 1px 3px rgba(16, 24, 40, 0.05),
        0 16px 32px -20px rgba(16, 24, 40, 0.22);
    }

    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      min-width: 0;
      padding: 0.5rem;
      border-radius: 0.75rem;
      text-align: center;
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
      background: var(--boxii-button, #4f46e5);
      color: var(--boxii-label, #ffffff);
    }
    a.cell {
      transition: opacity 0.15s ease;
    }
    a.cell:hover {
      opacity: 0.9;
    }

    .label {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      line-height: 1.15;
    }
    .cell.link .label {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .cell.title {
      font-size: 1.25rem;
      font-weight: 700;
    }

    svg.icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.8;
      display: block;
    }
  `;

  render() {
    const { cells, theme } = this.layout ?? emptyLayout();

    // Cells hidden because a spanning widget to their left covers them.
    const covered = new Set<number>();
    for (const [key, w] of Object.entries(cells)) {
      const anchor = Number(key);
      for (let i = 1; i < widgetSpan(w.type); i++) {
        if (colOf(anchor) + i < GRID_SIZE) covered.add(anchor + i);
      }
    }

    return html`
      <div
        class="canvas"
        style=${`${backgroundCss(theme)}--boxii-button:${theme.button};--boxii-label:${theme.label};grid-template-columns:repeat(${GRID_SIZE},minmax(0,1fr));grid-template-rows:repeat(${GRID_SIZE},minmax(0,1fr));`}
      >
        ${Array.from({ length: CELL_COUNT }, (_, cell) => {
          const widget = cells[cell];
          if (!widget || covered.has(cell)) return nothing;
          const span = Math.min(widgetSpan(widget.type), GRID_SIZE - colOf(cell));
          const placement = `grid-column:${colOf(cell) + 1} / span ${span};grid-row:${rowOf(cell) + 1};`;
          return this.renderWidget(widget, placement);
        })}
      </div>
    `;
  }

  private renderWidget(widget: Widget, placement: string) {
    if (widget.type === "link") {
      return html`
        <a
          class="cell link"
          style=${placement}
          href=${widget.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          ${this.linkIcon()}
          <span class="label">${widget.label || "Link"}</span>
        </a>
      `;
    }
    return html`
      <div class="cell title" style=${placement}>
        <span class="label">${widget.label || "Your title"}</span>
      </div>
    `;
  }

  /** Inlined lucide "link-2" so the shadow root needs no extra requests. */
  private linkIcon() {
    return html`<svg
      class="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${svg`<path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />`}
    </svg>`;
  }
}

if (!customElements.get("boxii-popover")) {
  customElements.define("boxii-popover", BoxiiPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    "boxii-popover": BoxiiPopover;
  }
}
