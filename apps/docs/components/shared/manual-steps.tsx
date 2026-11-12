"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** The event a setup prompt's menu sends to open the page's manual steps. */
export const OPEN_MANUAL_STEPS_EVENT = "aui:open-manual-steps";

const MANUAL_STEPS_SELECTOR = "[data-manual-steps]";

/** Opens the page's manual steps and scrolls to them; false when the page has none. */
export function openManualSteps(): boolean {
  const steps = document.querySelector<HTMLElement>(MANUAL_STEPS_SELECTOR);
  if (!steps) return false;
  window.dispatchEvent(new Event(OPEN_MANUAL_STEPS_EVENT));
  return true;
}

const hashTarget = () => {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return id ? document.getElementById(id) : null;
};

/**
 * A page's manual setup steps, hidden until the reader asks for them from
 * the setup prompt's menu. Opens on its own when the URL hash or the
 * browser's find-in-page lands inside it, and when a link to a heading
 * inside it is clicked (the table of contents lists those headings).
 */
export function ManualSteps({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const scrollTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const openOnHash = () => {
      const target = hashTarget();
      if (target && el.contains(target)) {
        scrollTo.current = target;
        setOpen(true);
      }
    };
    const openFromMenu = () => {
      scrollTo.current = el;
      setOpen(true);
    };
    // `hidden="until-found"` reveals the content for find-in-page and text
    // fragments; keep React's state in step with the browser.
    const onBeforeMatch = () => setOpen(true);
    // A click on a same-page link into the closed steps (the TOC, an
    // in-page link) opens them; a link to the current hash fires no
    // hashchange, so this catches it too.
    const onLinkClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href*='#']");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.pathname !== window.location.pathname) return;
      const id = decodeURIComponent(link.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target || !el.contains(target)) return;
      scrollTo.current = target;
      setOpen(true);
    };
    openOnHash();
    document.addEventListener("click", onLinkClick, true);
    window.addEventListener("hashchange", openOnHash);
    window.addEventListener(OPEN_MANUAL_STEPS_EVENT, openFromMenu);
    el.addEventListener("beforematch", onBeforeMatch);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      window.removeEventListener("hashchange", openOnHash);
      window.removeEventListener(OPEN_MANUAL_STEPS_EVENT, openFromMenu);
      el.removeEventListener("beforematch", onBeforeMatch);
    };
  }, []);

  // React renders `hidden` as a boolean; upgrade it to `until-found` so
  // find-in-page and text-fragment links still reach the closed steps.
  useLayoutEffect(() => {
    if (!open) ref.current?.setAttribute("hidden", "until-found");
  }, [open]);

  useEffect(() => {
    if (!open || !scrollTo.current) return;
    scrollTo.current.scrollIntoView({ block: "start" });
    scrollTo.current = null;
  }, [open]);

  return (
    <div
      ref={ref}
      id="manual-steps"
      data-manual-steps=""
      data-state={open ? "open" : "closed"}
      hidden={!open}
      className="scroll-mt-[calc(var(--docs-header-height,4rem)+1rem)]"
    >
      {children}
    </div>
  );
}
