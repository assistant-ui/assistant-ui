"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChainOfThoughtStrings } from "./strings";

const getPrefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    setPrefersReducedMotion(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    if (typeof mediaQueryList.addListener === "function") {
      mediaQueryList.addListener(handleChange);
      return () => mediaQueryList.removeListener(handleChange);
    }

    return undefined;
  }, []);

  return prefersReducedMotion;
};

/** Options for {@link useAutoScroll}. */
export type UseAutoScrollOptions = {
  /** Pin the container to the bottom as new content arrives. */
  autoPin?: boolean | undefined;
  /**
   * Track scroll position so `isScrolledUp` / `scrollToBottom` (and the jump
   * affordance) stay live even when not auto-pinning — e.g. a finished but
   * still height-constrained panel. Defaults to `autoPin`.
   */
  track?: boolean | undefined;
  behavior?: ScrollBehavior | undefined;
};

/** Tracks whether a scroll container should stay pinned to its latest content. */
export function useAutoScroll(
  scrollEl: HTMLElement | null,
  contentKey: unknown,
  options: UseAutoScrollOptions = {},
) {
  const { autoPin = false, track = autoPin, behavior = "auto" } = options;
  const [isScrolledUp, setIsScrolledUpState] = useState(false);
  const isScrolledUpRef = useRef(false);
  const lastTopRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  // `behavior` (smooth by default for the runtime) is reserved for the
  // user-initiated jump; reduced-motion always forces an instant scroll.
  const userScrollBehavior: ScrollBehavior = prefersReducedMotion
    ? "auto"
    : behavior;

  const setIsScrolledUp = useCallback((next: boolean) => {
    if (isScrolledUpRef.current === next) return;
    isScrolledUpRef.current = next;
    setIsScrolledUpState(next);
  }, []);

  const scrollToEnd = useCallback(
    (el: HTMLElement, scrollBehavior: ScrollBehavior) => {
      if (typeof el.scrollTo === "function") {
        el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    },
    [],
  );

  useEffect(() => {
    if (!track) setIsScrolledUp(false);
  }, [track, setIsScrolledUp]);

  // Pin to the latest content unless the user has scrolled away from the bottom.
  useLayoutEffect(() => {
    void contentKey;
    if (!autoPin || !scrollEl || isScrolledUpRef.current) return;
    // Pin instantly: a smooth animation can't keep up with bursts of new parts
    // landing within one frame, so it would visibly trail the latest content.
    scrollToEnd(scrollEl, "auto");
  }, [contentKey, autoPin, scrollEl, scrollToEnd]);

  // Detect intent by scroll *direction*, not absolute position. Programmatic
  // pinning only ever scrolls down, so a decrease in scrollTop is an
  // unambiguous user scroll-up (works for wheel, touch, keys, and scrollbar
  // drags alike). This avoids the smooth-scroll race where an in-flight
  // programmatic animation's events were misread as a user scroll-up.
  useEffect(() => {
    if (!track || !scrollEl) return;
    lastTopRef.current = scrollEl.scrollTop;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      const movedUp = scrollTop < lastTopRef.current - 1;
      lastTopRef.current = scrollTop;
      if (isAtBottom) {
        setIsScrolledUp(false);
      } else if (movedUp) {
        setIsScrolledUp(true);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [track, scrollEl, setIsScrolledUp]);

  const scrollToBottom = useCallback(() => {
    if (!scrollEl) return;
    // The user jump honors the requested (smooth) behavior. The scroll listener
    // detects intent by *direction*, so a downward smooth scroll is never
    // misread as a user scroll-up — the animation can't re-pause itself.
    scrollToEnd(scrollEl, userScrollBehavior);
    setIsScrolledUp(false);
  }, [scrollEl, scrollToEnd, userScrollBehavior, setIsScrolledUp]);

  return { isScrolledUp, scrollToBottom };
}

/** Floating button shown when auto-scroll is paused above the latest item. */
export function JumpToLatestButton({
  onClick,
  visible,
}: {
  onClick: () => void;
  visible: boolean;
}) {
  const strings = useChainOfThoughtStrings();
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="chain-of-thought-jump-to-latest"
      aria-label={strings.jumpToLatestLabel}
      className={cn(
        "aui-chain-of-thought-jump-to-latest absolute end-2 bottom-2 z-20",
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "bg-primary text-primary-foreground text-xs shadow-md",
        "transition-all duration-200 ease-(--spring-easing)",
        "hover:bg-primary/90 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "[&_svg]:size-3",
        "fade-in-0 slide-in-from-bottom-2 animate-in",
        "motion-reduce:animate-none motion-reduce:transition-none",
      )}
    >
      <ArrowDownIcon aria-hidden />
      {strings.jumpToLatest}
    </button>
  );
}
