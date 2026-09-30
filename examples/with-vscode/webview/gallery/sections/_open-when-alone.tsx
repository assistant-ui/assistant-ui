import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { galleryView } from "../view";

/** Whether the gallery shows section `id` on its own (a probe sweep or a screenshot). */
export function useShownAlone(id: string) {
  const view = useSyncExternalStore(galleryView.subscribe, galleryView.get);
  return view.section === id;
}

/**
 * Clicks the first element matching `selector` inside `children` once the
 * section is shown alone, to capture an overlay's open state. Overlays are
 * portalled and fixed, so in the full gallery they stay closed rather than
 * covering every other section.
 */
export function ClickWhenAlone({
  id,
  selector,
  children,
  className,
}: {
  id: string;
  selector: string;
  children: ReactNode;
  className?: string;
}) {
  const alone = useShownAlone(id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!alone) return;
    ref.current?.querySelector<HTMLElement>(selector)?.click();
  }, [alone, selector]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
