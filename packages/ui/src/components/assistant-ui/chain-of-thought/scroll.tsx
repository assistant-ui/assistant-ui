"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChainOfThoughtStrings } from "./strings";

const getPrefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const subscribeToReducedMotion = (onStoreChange: () => void) => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handleChange = () => {
    onStoreChange();
  };

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }

  if (typeof mediaQueryList.addListener === "function") {
    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }

  return () => {};
};

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeToReducedMotion,
    getPrefersReducedMotion,
    () => false,
  );

export type UseAutoScrollOptions = {
  autoPin?: boolean | undefined;
  track?: boolean | undefined;
  behavior?: ScrollBehavior | undefined;
};

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
  // Reduced motion forces an instant user jump.
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

  useLayoutEffect(() => {
    void contentKey;
    if (!autoPin || !scrollEl || isScrolledUpRef.current) return;
    // Pin instantly so bursty streams do not trail the latest content.
    scrollToEnd(scrollEl, "auto");
  }, [contentKey, autoPin, scrollEl, scrollToEnd]);

  // A downward programmatic scroll must not read as user intent to pause.
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
    scrollToEnd(scrollEl, userScrollBehavior);
    setIsScrolledUp(false);
  }, [scrollEl, scrollToEnd, userScrollBehavior, setIsScrolledUp]);

  return { isScrolledUp: track && isScrolledUp, scrollToBottom };
}

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
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
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
