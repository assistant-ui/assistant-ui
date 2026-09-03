"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HomeThread } from "@/components/pages/home/home-thread";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import Link from "next/link";

export function ThreadSpecimen() {
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlayRef.current?.focus();
    // Menus and dialogs close themselves on Escape; the selection toolbar does
    // not, so it only counts as its own layer for focus, not for Escape.
    const isInsideLayer = (target: EventTarget | null, selector: string) => {
      if (!(target instanceof Element)) return false;
      const layer = target.closest(selector);
      return layer !== null && layer !== overlayRef.current;
    };
    const isInsidePopup = (target: EventTarget | null) =>
      isInsideLayer(target, '[role="menu"], [role="dialog"]');
    const isInsideFocusLayer = (target: EventTarget | null) =>
      isInsideLayer(
        target,
        '[role="menu"], [role="dialog"], [data-slot="selection-toolbar"]',
      );
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (isInsidePopup(event.target)) return;
        setExpanded(false);
        return;
      }
      if (event.key !== "Tab") return;
      const root = overlayRef.current;
      if (!root) return;
      if (isInsideFocusLayer(document.activeElement)) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const current = document.activeElement;
      if (!(current instanceof HTMLElement) || !root.contains(current)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && (current === first || current === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const root = overlayRef.current;
      const target = event.target;
      if (!root || !(target instanceof HTMLElement)) return;
      if (root.contains(target) || isInsideFocusLayer(target)) return;
      root.focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      document.documentElement.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [expanded]);

  const thread = (
    <HomeThread
      expanded={expanded}
      onToggleExpanded={() => setExpanded((prev) => !prev)}
    />
  );

  return (
    <section aria-label="Thread" className="flex flex-col gap-3">
      <div className="border-foreground/10 rounded-document h-[min(52rem,88svh)] overflow-hidden border">
        <DocsRuntimeProvider devtools={false} followUps>
          {expanded
            ? createPortal(
                <div
                  ref={overlayRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Thread fullscreen"
                  tabIndex={-1}
                  className="bg-background fixed inset-0 z-50 overflow-hidden outline-none"
                >
                  {thread}
                </div>,
                document.body,
              )
            : thread}
        </DocsRuntimeProvider>
      </div>
      <div className="flex justify-end">
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
        >
          Explore other examples
        </Link>
      </div>
    </section>
  );
}
