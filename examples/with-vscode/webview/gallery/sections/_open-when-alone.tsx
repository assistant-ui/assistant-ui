import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { galleryView, OVERLAY_ATTRIBUTE } from "../view";

/** Whether the gallery shows section `id` on its own (a probe sweep or a screenshot). */
export function useShownAlone(id: string) {
  const view = useSyncExternalStore(galleryView.subscribe, galleryView.get);
  return view.section === id;
}

/**
 * Clicks the first element matching `selector` inside `children` once the
 * section is shown alone, to capture an overlay's open state. Overlays are
 * portalled and fixed, so in the full gallery they stay closed rather than
 * covering every other section. While it is open, the body stands in for the
 * webview viewport: it becomes the overlay's containing block, as wide as the
 * section at a fixed gallery width, and the capture covers it.
 */
export function ClickWhenAlone({
  id,
  selector,
  children,
}: {
  id: string;
  selector: string;
  children: ReactNode;
}) {
  const view = useSyncExternalStore(galleryView.subscribe, galleryView.get);
  const alone = view.section === id;
  const fixedWidth = view.width !== null;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!alone) return;
    const { body } = document;
    body.setAttribute(OVERLAY_ATTRIBUTE, fixedWidth ? "fixed-width" : "");
    ref.current?.querySelector<HTMLElement>(selector)?.click();
    return () => body.removeAttribute(OVERLAY_ATTRIBUTE);
  }, [alone, fixedWidth, selector]);
  return <div ref={ref}>{children}</div>;
}
