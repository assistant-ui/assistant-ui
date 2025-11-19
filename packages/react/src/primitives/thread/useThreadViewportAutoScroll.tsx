"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { RefCallback, useCallback, useRef } from "react";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";

export namespace useThreadViewportAutoScroll {
  export type Options = {
    autoScroll?: boolean | undefined;
  };
}

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll = true,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();

  const lastScrollTop = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  const isScrollingToBottomRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    isScrollingToBottomRef.current = true;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        isScrollingToBottomRef.current = false;
      }

      if (newIsAtBottom !== isAtBottom) {
        writableStore(threadViewportStore).setState({
          isAtBottom: newIsAtBottom,
        });
      }
    }

    lastScrollTop.current = div.scrollTop;
  };

  const resizeRef = useOnResizeContent(() => {
    if (
      autoScroll &&
      (isScrollingToBottomRef.current ||
        threadViewportStore.getState().isAtBottom)
    ) {
      scrollToBottom("instant");
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });

  useOnScrollToBottom(() => {
    scrollToBottom("auto");
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
