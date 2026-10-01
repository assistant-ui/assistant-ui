import { useEffect, useRef, type ReactNode } from "react";
import {
  ExportedMessageRepository,
  useAui,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";

type OpenAction = "click" | "hover";

const hover = (el: HTMLElement) => {
  for (const type of ["pointerover", "pointerenter", "pointermove"]) {
    el.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerType: "mouse" }),
    );
  }
  for (const type of ["mouseover", "mouseenter", "mousemove"]) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  }
};

/**
 * Opens a popup that has no `open` or `defaultOpen` prop, once its trigger has
 * mounted: clicks or hovers the first element inside that matches
 * `selector`. The box reserves `className` room (a height) so the popup, which
 * portals to the body, lands inside the section's card.
 */
export function OpenOnMount({
  selector,
  action = "click",
  className,
  children,
}: {
  selector: string;
  action?: OpenAction;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(selector);
      if (!el) return;
      if (action === "click") el.click();
      else hover(el);
    }, 50);
    return () => clearTimeout(id);
  }, [selector, action]);
  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
    </div>
  );
}

export type BranchItem = {
  message: ThreadMessageLike;
  parentId: string | null;
};

/**
 * Replaces the thread's messages with a message tree, so sibling messages
 * (edits and regenerations) show a branch picker. Render it inside
 * `SeededRuntime`.
 */
export function ImportBranches({
  items,
  headId,
}: {
  items: readonly BranchItem[];
  headId: string;
}) {
  const aui = useAui();
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current) return;
    imported.current = true;
    aui
      .thread()
      .import(ExportedMessageRepository.fromBranchableArray(items, { headId }));
  }, [aui, items, headId]);
  return null;
}

/** An SVG as a `data:` URL, which the strict CSP allows for images. */
export const svgDataUrl = (body: string, width = 320, height = 180) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

export const SCREENSHOT_IMAGE = svgDataUrl(
  `<rect width="320" height="180" fill="#1e1e1e"/><rect x="16" y="16" width="288" height="24" rx="4" fill="#3c3c3c"/><rect x="16" y="52" width="180" height="10" rx="3" fill="#569cd6"/><rect x="16" y="72" width="240" height="10" rx="3" fill="#9cdcfe"/><rect x="16" y="92" width="120" height="10" rx="3" fill="#ce9178"/><rect x="16" y="140" width="288" height="24" rx="12" fill="#2d2d30" stroke="#0078d4"/>`,
);
