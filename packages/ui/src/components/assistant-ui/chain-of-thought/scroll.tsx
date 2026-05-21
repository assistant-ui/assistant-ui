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

export function useAutoScroll(
  scrollEl: HTMLElement | null,
  contentKey: unknown,
  enabled: boolean,
  behavior: ScrollBehavior = "auto",
) {
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isProgrammaticRef = useRef(false);

  useEffect(() => {
    if (!enabled) setIsScrolledUp(false);
  }, [enabled]);

  useLayoutEffect(() => {
    void contentKey;
    if (!enabled || !scrollEl || isScrolledUp) return;

    isProgrammaticRef.current = true;
    if (typeof scrollEl.scrollTo === "function") {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
    } else {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    queueMicrotask(() => {
      isProgrammaticRef.current = false;
    });
  }, [contentKey, enabled, isScrolledUp, scrollEl, behavior]);

  useEffect(() => {
    if (!enabled || !scrollEl) return;

    const handleScroll = () => {
      if (isProgrammaticRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      setIsScrolledUp(!isAtBottom);
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [enabled, scrollEl]);

  const scrollToBottom = useCallback(() => {
    if (!scrollEl) return;
    isProgrammaticRef.current = true;
    if (typeof scrollEl.scrollTo === "function") {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    } else {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    setIsScrolledUp(false);
    queueMicrotask(() => {
      isProgrammaticRef.current = false;
    });
  }, [scrollEl]);

  return { isScrolledUp, scrollToBottom };
}

export function JumpToLatestButton({
  onClick,
  visible,
}: {
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="chain-of-thought-jump-to-latest"
      className={cn(
        "aui-chain-of-thought-jump-to-latest absolute right-2 bottom-2 z-20",
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "bg-primary text-primary-foreground text-xs shadow-md",
        "transition-all duration-200 ease-(--spring-easing)",
        "hover:bg-primary/90 hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "[&_svg]:size-3",
        "fade-in-0 slide-in-from-bottom-2 animate-in",
      )}
    >
      <ArrowDownIcon aria-hidden />
      Latest
    </button>
  );
}
