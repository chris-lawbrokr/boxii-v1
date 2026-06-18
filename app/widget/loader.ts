/**
 * loader.ts — the host-site embed entry point (the "shareable" part).
 * --------------------------------------------------------------------------
 * A host site includes ONE script:
 *
 *   <script
 *     src="https://<your-boxii-host>/embed.js"
 *     data-config="<configuration-id>"
 *     defer
 *   ></script>
 *
 * The loader registers <boxii-popover> (via the import), fetches the published
 * layout from /api/embed/<configId>, and mounts the popover inside a modal
 * overlay with a backdrop, a close button, and a floating pill to reopen it.
 *
 * The popover CARD itself is the Lit <boxii-popover> element — the exact same
 * element the dashboard editor previews. All the *modal chrome* (backdrop /
 * trigger / sizing) lives here, host-side, so the element stays a reusable card.
 *
 * NOTE: this module is the source for a standalone bundle (e.g. emitted as
 * `public/embed.js` via esbuild/rollup with `format: "iife"`). Until that build
 * step is wired, it documents and implements the full client contract.
 */

import "./popover-element";
import { parseLayout, type Layout } from "../ui/widget-types";

type EmbedResponse = { id: string; name: string; layout: Layout };

/** Read config from the currently-executing <script> tag, with attribute
 *  fallbacks so the loader works however it was included. */
function readConfig(): { configId: string | null; base: string } {
  const current =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>("script[data-config]");
  const configId = current?.getAttribute("data-config") ?? null;
  // Origin to fetch the layout from — defaults to where the script was served.
  const base =
    current?.getAttribute("data-base") ??
    (current?.src ? new URL(current.src).origin : window.location.origin);
  return { configId, base };
}

async function fetchLayout(base: string, configId: string): Promise<Layout> {
  const res = await fetch(`${base}/api/embed/${encodeURIComponent(configId)}`);
  if (!res.ok) throw new Error(`boxii: embed ${configId} unavailable (${res.status})`);
  const data = (await res.json()) as EmbedResponse;
  return parseLayout(data.layout);
}

function injectStyles() {
  if (document.getElementById("boxii-embed-styles")) return;
  const style = document.createElement("style");
  style.id = "boxii-embed-styles";
  style.textContent = `
    .boxii-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);opacity:0;transition:opacity .25s ease;}
    .boxii-overlay.open{opacity:1;}
    .boxii-overlay.gone{display:none;}
    .boxii-frame{position:relative;width:100%;aspect-ratio:1080/1920;max-width:min(100%,26rem,calc((100dvh - 6rem) * 9 / 16));}
    @media (min-width:1080px){.boxii-frame{aspect-ratio:1920/1080;max-width:min(100%,64rem,calc((100dvh - 6rem) * 16 / 9));}}
    .boxii-close{position:absolute;top:-2.5rem;right:0;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:9999px;background:rgba(255,255,255,.15);color:#fff;font-size:1.1rem;line-height:1;cursor:pointer;}
    .boxii-close:hover{background:rgba(255,255,255,.3);}
    .boxii-pill{position:fixed;bottom:1.5rem;right:1.5rem;z-index:2147483000;border:0;border-radius:9999px;padding:.75rem 1.25rem;background:#4f46e5;color:#fff;font:600 .9rem/1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 10px 25px -8px rgba(16,24,40,.5);cursor:pointer;}
    .boxii-pill.gone{display:none;}
  `;
  document.head.appendChild(style);
}

function mount(layout: Layout) {
  injectStyles();

  const overlay = document.createElement("div");
  overlay.className = "boxii-overlay";

  const frame = document.createElement("div");
  frame.className = "boxii-frame";

  const close = document.createElement("button");
  close.className = "boxii-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.textContent = "✕";

  const popover = document.createElement("boxii-popover");
  popover.layout = layout;

  frame.append(close, popover);
  overlay.append(frame);

  const pill = document.createElement("button");
  pill.className = "boxii-pill gone";
  pill.type = "button";
  pill.textContent = "Open";

  const setOpen = (open: boolean) => {
    if (open) {
      overlay.classList.remove("gone");
      pill.classList.add("gone");
      requestAnimationFrame(() => overlay.classList.add("open"));
    } else {
      overlay.classList.remove("open");
      pill.classList.remove("gone");
      window.setTimeout(() => overlay.classList.add("gone"), 250);
    }
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) setOpen(false);
  });
  close.addEventListener("click", () => setOpen(false));
  pill.addEventListener("click", () => setOpen(true));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) setOpen(false);
  });

  document.body.append(overlay, pill);
  // Show on load.
  requestAnimationFrame(() => overlay.classList.add("open"));
}

async function init() {
  const { configId, base } = readConfig();
  if (!configId) {
    console.error("boxii: missing data-config on the embed <script> tag");
    return;
  }
  try {
    mount(await fetchLayout(base, configId));
  } catch (err) {
    console.error(err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
