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
  embedUrl,
  contrastText,
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
      border-radius: 1.5rem;
      border: 1px solid color-mix(in srgb, var(--boxii-on) 12%, transparent);
      box-shadow:
        0 1px 3px rgba(16, 24, 40, 0.06),
        0 28px 56px -28px rgba(16, 24, 40, 0.5);
    }

    /* Frosted-glass card: a translucent veil over the canvas with a hairline
       border, blur, and soft depth — sits on the gradient like the hero cards. */
    .cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.25rem;
      min-width: 0;
      padding: 0.75rem;
      border-radius: 1rem;
      text-align: left;
      text-decoration: none;
      color: var(--boxii-on, #ffffff);
      background: color-mix(in srgb, var(--boxii-on) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--boxii-on) 14%, transparent);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--boxii-on) 10%, transparent),
        0 1px 2px rgba(16, 24, 40, 0.12);
    }
    a.cell {
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }
    a.cell:hover {
      background: color-mix(in srgb, var(--boxii-on) 14%, transparent);
      border-color: color-mix(in srgb, var(--boxii-on) 26%, transparent);
    }

    .label {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }

    /* Link → a row card: title on the left, an arrow affordance on the right. */
    .cell.link {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .cell.link .label {
      font-size: 0.9rem;
      font-weight: 600;
    }
    .cell.link .arrow {
      opacity: 0.7;
    }

    /* Title → a serif hero heading. */
    .cell.title .label {
      font-family: ui-serif, Georgia, "Times New Roman", serif;
      font-size: 1.6rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.05;
    }
    .cell.title .subtitle {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      line-height: 1.25;
      font-size: 0.8rem;
      font-weight: 400;
      opacity: 0.7;
    }

    .cell.text {
      justify-content: flex-start;
      font-size: 0.82rem;
      font-weight: 400;
      line-height: 1.4;
    }
    .cell.text .body {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      overflow: hidden;
      opacity: 0.85;
    }

    /* Media widgets fill their cell edge-to-edge — keep the frame, drop the veil. */
    .cell.media {
      padding: 0;
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      overflow: hidden;
    }
    .cell.media img,
    .cell.media iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      object-fit: cover;
    }
    .cell.placeholder {
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      opacity: 0.8;
    }

    svg.icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.8;
      display: block;
    }
    .cell.link .arrow svg.icon {
      width: 18px;
      height: 18px;
      opacity: 1;
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
        style=${`${backgroundCss(theme)}--boxii-button:${theme.button};--boxii-label:${theme.label};--boxii-on:${contrastText(theme.canvas)};grid-template-columns:repeat(${GRID_SIZE},minmax(0,1fr));grid-template-rows:repeat(${GRID_SIZE},minmax(0,1fr));`}
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
    switch (widget.type) {
      case "link":
        return html`
          <a
            class="cell link"
            style=${placement}
            href=${widget.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="label">${widget.label || "Link"}</span>
            <span class="arrow">${this.arrowIcon()}</span>
          </a>
        `;
      case "text":
        return html`
          <div class="cell text" style=${placement}>
            <span class="body">${widget.text}</span>
          </div>
        `;
      case "image":
        return widget.url
          ? html`
              <div class="cell media" style=${placement}>
                <img src=${widget.url} alt=${widget.alt} loading="lazy" />
              </div>
            `
          : html`
              <div class="cell placeholder" style=${placement}>
                ${this.imageIcon()}
                <span>Image</span>
              </div>
            `;
      case "video": {
        const src = embedUrl(widget.url);
        return src
          ? html`
              <div class="cell media" style=${placement}>
                <iframe
                  src=${src}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  title="Embedded video"
                ></iframe>
              </div>
            `
          : html`
              <div class="cell placeholder" style=${placement}>
                ${this.videoIcon()}
                <span>Video</span>
              </div>
            `;
      }
      case "title":
      default:
        return html`
          <div class="cell title" style=${placement}>
            <span class="label">${widget.label || "Your title"}</span>
            ${widget.subtitle
              ? html`<span class="subtitle">${widget.subtitle}</span>`
              : nothing}
          </div>
        `;
    }
  }

  /** Inlined lucide "arrow-up-right" — the link card's go-to affordance. */
  private arrowIcon() {
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
      ${svg`<path d="M7 7h10v10" /><path d="M7 17 17 7" />`}
    </svg>`;
  }

  /** Inlined lucide "image" placeholder icon. */
  private imageIcon() {
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
      ${svg`<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />`}
    </svg>`;
  }

  /** Inlined lucide "video" placeholder icon. */
  private videoIcon() {
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
      ${svg`<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" />`}
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
