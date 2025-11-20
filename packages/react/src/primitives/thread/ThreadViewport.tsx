"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { ThreadViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useAssistantState } from "../../context";
import { useThreadViewportIsAtBottom } from "./useThreadViewportIsAtBottom";

export namespace ThreadPrimitiveViewport {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     * @default true
     */
    autoScroll?: boolean | undefined;
  };
}

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ autoScroll = true, children, ...rest }, forwardedRef) => {
  const viewportRef = useRef<ThreadPrimitiveViewport.Element>(null);
  const trackIsAtBottomRef = useThreadViewportIsAtBottom(viewportRef);

  const isRunning = useAssistantState(({ thread }) => thread.isRunning);
  const messagesLength = useAssistantState(
    ({ thread }) => thread.messages.length,
  );

  const scrollToLastUserMessage = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return false;

    // TODO: Simon to expose last user message reference through api or something like that.
    const len = viewport.children.length;
    // 1. Composer
    // 2. Spacer
    // 3. Last assistant message
    // 4. Last user message
    const target = viewport.children.item(len - 4) as HTMLElement | null;

    if (!target) return false;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    let offsetTop = targetRect.top - viewportRect.top + viewport.scrollTop;

    // Temporary heuristic: if message is tall (> 3 lines ~ 80px), scroll to show the bottom part
    const TALL_MESSAGE_THRESHOLD = 80;

    if (targetRect.height > TALL_MESSAGE_THRESHOLD) {
      offsetTop += targetRect.height - TALL_MESSAGE_THRESHOLD;
    }

    viewport.scrollTo({
      top: offsetTop,
      behavior: "auto",
    });
    return true;
  }, []);

  const prevMessagesLengthRef = useRef(messagesLength);
  const prevIsRunningRef = useRef(isRunning);

  useLayoutEffect(() => {
    const prevMessagesLength = prevMessagesLengthRef.current;
    const prevIsRunning = prevIsRunningRef.current;

    const messageAdded = messagesLength > prevMessagesLength;
    const runStarted = isRunning && !prevIsRunning;

    if (messageAdded || runStarted) {
      scrollToLastUserMessage();
    }

    prevMessagesLengthRef.current = messagesLength;
    prevIsRunningRef.current = isRunning;
  }, [autoScroll, isRunning, messagesLength, scrollToLastUserMessage]);

  const ref = useComposedRefs<ThreadPrimitiveViewport.Element>(
    forwardedRef,
    viewportRef,
    trackIsAtBottomRef,
  );

  return (
    <Primitive.div {...rest} ref={ref}>
      {children}
    </Primitive.div>
  );
});

ThreadPrimitiveViewportScrollable.displayName =
  "ThreadPrimitive.ViewportScrollable";

/**
 * A scrollable viewport container for thread messages.
 *
 * This component provides a scrollable area for displaying thread messages with
 * automatic scrolling capabilities. It manages the viewport state and provides
 * context for child components to access viewport-related functionality.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Viewport autoScroll={true}>
 *   <ThreadPrimitive.Messages components={{ Message: MyMessage }} />
 * </ThreadPrimitive.Viewport>
 * ```
 */
export const ThreadPrimitiveViewport = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>((props, ref) => {
  return (
    <ThreadViewportProvider>
      <ThreadPrimitiveViewportScrollable {...props} ref={ref} />
    </ThreadViewportProvider>
  );
});

ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";
