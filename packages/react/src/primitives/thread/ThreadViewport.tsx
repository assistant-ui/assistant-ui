"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, useRef } from "react";
import { useThreadContext } from "../../context/ThreadContext";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";

type ThreadViewportElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadViewportProps = PrimitiveDivProps & {
  autoScroll?: boolean;
};

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ autoScroll = true, onScroll, children, ...rest }, forwardedRef) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const divRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, divRef);

  const { useViewport } = useThreadContext();

  // TODO find a more elegant implementation for this

  const firstRenderRef = useRef(true);
  const isScrollingToBottomRef = useRef(false);
  const lastScrollTop = useRef<number>(0);

  const scrollToBottom = () => {
    const div = messagesEndRef.current;
    if (!div || !autoScroll) return;

    const behavior = firstRenderRef.current ? "instant" : "auto";
    firstRenderRef.current = false;

    isScrollingToBottomRef.current = true;
    div.scrollIntoView({ behavior });
  };

  useOnResizeContent(divRef, () => {
    if (!isScrollingToBottomRef.current && !useViewport.getState().isAtBottom) {
      handleScroll();
    } else {
      scrollToBottom();
    }
  });

  useOnScrollToBottom(() => {
    scrollToBottom();
  });

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = useViewport.getState().isAtBottom;
    const newIsAtBottom = div.scrollHeight - div.scrollTop <= div.clientHeight;

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else if (newIsAtBottom !== isAtBottom) {
      isScrollingToBottomRef.current = false;
      useViewport.setState({ isAtBottom: newIsAtBottom });
    }

    lastScrollTop.current = div.scrollTop;
  };

  return (
    <Primitive.div
      {...rest}
      onScroll={composeEventHandlers(onScroll, handleScroll)}
      ref={ref}
    >
      {children}
      <div ref={messagesEndRef} />
    </Primitive.div>
  );
});
