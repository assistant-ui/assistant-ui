"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { Panels } from "@/components/library/ui/panels";
import { readStored, writeStored } from "@/lib/library/persisted-state";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CartSheet } from "./cart-sheet";
import { LibraryHistoryButtons } from "./library-history";
import { LibrarySidebar } from "./library-sidebar";

/** How long a reload keeps trying to scroll back while the page fills in. */
const RESTORE_MS = 1500;

/**
 * The page scrolls in `main`, not the window, so the browser can't put it
 * back on a reload. Each path's offset is kept for the tab, and the first
 * load scrolls back to it, retrying while late content grows the page, until
 * it gets there or the person scrolls themselves.
 */
function useScrollRestore(ref: RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const key = `aui-library-scroll:${pathname}`;
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const main = ref.current;
    if (!main) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        writeStored(keyRef.current, Math.round(main.scrollTop), "session"),
      );
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      main.removeEventListener("scroll", onScroll);
    };
  }, [ref]);

  // Only the first load: a link to another page starts at its top.
  useEffect(() => {
    const main = ref.current;
    const target = readStored(keyRef.current, "session");
    if (!main || typeof target !== "number" || target <= 0) return;
    const start = performance.now();
    let frame = 0;
    const step = () => {
      main.scrollTop = target;
      if (
        Math.abs(main.scrollTop - target) > 1 &&
        performance.now() - start < RESTORE_MS
      )
        frame = requestAnimationFrame(step);
    };
    const stop = () => cancelAnimationFrame(frame);
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const event of events)
      main.addEventListener(event, stop, { once: true, passive: true });
    step();
    return () => {
      stop();
      for (const event of events) main.removeEventListener(event, stop);
    };
  }, [ref]);
}

/** The frame every library page sits in: the sidebar, and the page beside it. */
export function LibraryShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  useScrollRestore(mainRef);

  return (
    <>
      <Panels
        // The server renders the wide layout, so the side panel is hidden on a
        // phone before hydration moves it into its sheet; `!` beats the
        // panel's inline `display`. The glass header takes the page's color,
        // which the dark popover color is lighter than.
        className="h-full [--glass:color-mix(in_oklab,var(--background)_72%,transparent)] [--popover:var(--background)] max-md:[&>#panel-left]:hidden!"
        glassHeader
        headers={{
          left: <LibraryHistoryButtons />,
          main: (
            <ThemeToggle className="hover:text-foreground ms-auto size-7 rounded-md" />
          ),
        }}
        left={<LibrarySidebar />}
        storageKey="aui-library-panels"
      >
        <main
          ref={mainRef}
          {...MAIN_CONTENT_PROPS}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </Panels>
      <CartSheet />
    </>
  );
}
