import type { GalleryView } from "../../src/protocol";
import { setActiveSection } from "./recorder";

/**
 * Set on the body while a section shown alone holds an open overlay; the
 * value is `fixed-width` when the gallery forces a section width.
 */
export const OVERLAY_ATTRIBUTE = "data-gallery-overlay";

let current: GalleryView = { section: null, width: null };
const listeners = new Set<() => void>();
const waiting = new Map<GalleryView, () => void>();

/** What the gallery shows; tasks switch it without reloading the webview. */
export const galleryView = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Resolves once React has committed `view`. */
  set(view: GalleryView) {
    current = view;
    setActiveSection(view.section);
    const done = new Promise<void>((resolve) => waiting.set(view, resolve));
    for (const listener of listeners) listener();
    return done;
  },
  committed(view: GalleryView) {
    waiting.get(view)?.();
    waiting.delete(view);
  },
};
