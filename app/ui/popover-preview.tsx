"use client";

import { useEffect, useRef } from "react";
import type { Layout } from "./widget-types";
import type { BoxiiPopover } from "@/app/widget/popover-element";

/**
 * Renders the real <boxii-popover> Lit element inside React. The editor's
 * preview mode uses this so what the user previews is byte-for-byte what the
 * embeddable widget ships — no separate React reimplementation of the popover.
 *
 * The element is created imperatively (not via JSX) so it never renders on the
 * server: Lit/customElements are browser-only, and the element module is
 * dynamically imported on mount. Layout changes are pushed as a JS property.
 */
export function PopoverPreview({ layout }: { layout: Layout }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<BoxiiPopover | null>(null);
  // Keep the latest layout reachable from the (one-time) mount effect, whose
  // async import may resolve after the initial render.
  const layoutRef = useRef(layout);

  // Define + create the element once, client-side only.
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    import("@/app/widget/popover-element").then(() => {
      if (cancelled || !hostRef.current) return;
      let el = elRef.current;
      if (!el) {
        el = document.createElement("boxii-popover");
        el.style.display = "block";
        el.style.width = "100%";
        el.style.height = "100%";
        hostRef.current.appendChild(el);
        elRef.current = el;
      }
      el.layout = layoutRef.current;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Push layout edits to the live element (and keep the ref current for the
  // mount effect's deferred first assignment).
  useEffect(() => {
    layoutRef.current = layout;
    if (elRef.current) elRef.current.layout = layout;
  }, [layout]);

  return <div ref={hostRef} className="h-full w-full" />;
}
