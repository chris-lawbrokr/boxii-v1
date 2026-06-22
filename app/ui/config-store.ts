"use client";

import { useSyncExternalStore } from "react";
import type { Layout, Theme } from "./widget-types";

/** Shared client store for the configuration editor.
 *
 *  The editor's canvas (the `children` slot) and its panel (the `@sidebar`
 *  slot) are separate parallel-route subtrees, so they can't share React state
 *  through props or context. They DO share this module, so we keep the single
 *  source of truth here: the canvas places/moves widgets, the sidebar edits the
 *  theme, and both write to the same layout. The canvas owns persistence — it
 *  subscribes to layout changes and debounce-saves the whole thing. */
type StoreState = { configId: string; layout: Layout; brandColors: string[] };

let state: StoreState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

/** Seed the store for a configuration. Idempotent per config: the first slot to
 *  render wins, so reopening the same config preserves in-memory edits and a
 *  late-rendering slot never clobbers them. Switching configs reseeds. */
function init(configId: string, layout: Layout, brandColors: string[]) {
  if (state && state.configId === configId) return;
  state = { configId, layout, brandColors };
  // No committed subscribers exist on the initial render that seeds the store,
  // so this notify is a no-op then; on a config switch it refreshes consumers.
  emit();
}

/** Initialize (once per config) and subscribe to the editor store. Both the
 *  canvas and the sidebar call this with their own server-provided data, so
 *  whichever renders first seeds it and both read identical state. */
export function useConfigStore(
  configId: string,
  initialLayout: Layout,
  brandColors: string[],
): StoreState {
  init(configId, initialLayout, brandColors);
  // Non-null: init() ran synchronously above for this render.
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as StoreState;
}

/** Replace the layout via an updater. Ignored before the store is seeded. */
export function updateLayout(updater: (layout: Layout) => Layout) {
  if (!state) return;
  state = { ...state, layout: updater(state.layout) };
  emit();
}

/** Patch the theme (used by the sidebar theme editor). */
export function updateTheme(patch: Partial<Theme>) {
  updateLayout((layout) => ({ ...layout, theme: { ...layout.theme, ...patch } }));
}
