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
import { ThreadViewportAnchorProvider } from "./ThreadViewportAnchorContext";

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
  const lastUserMessageAnchorRef = useRef<HTMLElement | null>(null);
  const trackIsAtBottomRef = useThreadViewportIsAtBottom(viewportRef);
  const pendingScrollRef = useRef(false);

  const scrollToLastUserMessage = useCallback(() => {
    const viewport = viewportRef.current;
    const anchor = lastUserMessageAnchorRef.current;
    console.log("anchor", anchor);
    console.log("viewport", viewport);
    if (!viewport || !anchor) return false;

    const messageElement =
      (anchor.previousElementSibling as HTMLElement | null) ?? anchor;

    console.log("messageElement", messageElement);

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = messageElement.getBoundingClientRect();
    let offsetTop = targetRect.top - viewportRect.top + viewport.scrollTop;

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

  const registerLastUserMessageAnchor = useCallback(
    (node: HTMLElement | null) => {
      lastUserMessageAnchorRef.current = node;
      if (node && pendingScrollRef.current) {
        if (scrollToLastUserMessage()) {
          pendingScrollRef.current = false;
        }
      }
    },
    [scrollToLastUserMessage],
  );

  const threadState = useAssistantState(({ thread }) => thread);
  const isRunning = threadState.isRunning;
  const messagesLength = threadState.messages.length;

  const previousStateRef = useRef({
    isRunning,
    messagesLength,
  });

  useLayoutEffect(() => {
    if (!autoScroll) {
      previousStateRef.current = { isRunning, messagesLength };
      return;
    }

    const { isRunning: prevIsRunning, messagesLength: prevMessagesLength } =
      previousStateRef.current;

    const messageAdded = messagesLength > prevMessagesLength;
    const runStarted = isRunning && !prevIsRunning;

    if (messageAdded || runStarted) {
      pendingScrollRef.current = true;
      if (scrollToLastUserMessage()) {
        pendingScrollRef.current = false;
      }
    }

    previousStateRef.current = { isRunning, messagesLength };
  }, [autoScroll, isRunning, messagesLength, scrollToLastUserMessage]);

  const ref = useComposedRefs<ThreadPrimitiveViewport.Element>(
    forwardedRef,
    viewportRef,
    trackIsAtBottomRef,
  );

  return (
    <ThreadViewportAnchorProvider value={{ registerLastUserMessageAnchor }}>
      <Primitive.div {...rest} ref={ref}>
        {children}
      </Primitive.div>
    </ThreadViewportAnchorProvider>
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
