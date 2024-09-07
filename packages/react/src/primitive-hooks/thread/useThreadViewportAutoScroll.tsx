"use client";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useRef } from "react";
import { useThreadContext } from "../../context/react/ThreadContext";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";

export type UseThreadViewportAutoScrollProps = {
  autoScroll?: boolean | undefined;
};

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll = true,
}: UseThreadViewportAutoScrollProps) => {
  const divRef = useRef<TElement>(null);

  const { useViewport } = useThreadContext();

  const lastScrollTop = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  const isScrollingToBottomRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div || !autoScroll) return;

    isScrollingToBottomRef.current = true;
    div.scrollTo({ top: div.scrollHeight, behavior });
  };

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = useViewport.getState().isAtBottom;
    const newIsAtBottom =
      div.scrollHeight - div.scrollTop <= div.clientHeight + 1; // TODO figure out why +1 is needed

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        isScrollingToBottomRef.current = false;
      }

      if (newIsAtBottom !== isAtBottom) {
        writableStore(useViewport).setState({ isAtBottom: newIsAtBottom });
      }
    }

    lastScrollTop.current = div.scrollTop;
  };

  const resizeRef = useOnResizeContent(() => {
    if (isScrollingToBottomRef.current || useViewport.getState().isAtBottom) {
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

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);

  useOnScrollToBottom(() => {
    scrollToBottom("auto");
  });

  return autoScrollRef;
};
