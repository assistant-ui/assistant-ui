"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { ThreadViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useAssistantState } from "../../context";

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
  const ref = useComposedRefs<ThreadPrimitiveViewport.Element>(
    forwardedRef,
    viewportRef,
  );

  const isRunning = useAssistantState(({ thread }) => thread.isRunning);
  const lastUserMessageId = useAssistantState(({ thread }) => {
    for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
      const message = thread.messages[i]!;
      if (message.role === "user") return message.id;
    }
    return undefined;
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  const scrollToUserMessage = useCallback((messageId?: string) => {
    const viewport = viewportRef.current;
    if (!viewport) return false;

    let target: HTMLElement | null = null;
    if (messageId) {
      const escapedId =
        typeof CSS !== "undefined" && CSS.escape
          ? CSS.escape(messageId)
          : messageId;
      target = viewport.querySelector<HTMLElement>(
        `[data-thread-message-id='${escapedId}']`,
      );
    } else {
      // Only fallback if no ID provided
      const userMessages = viewport.querySelectorAll<HTMLElement>(
        "[data-thread-message-role='user']",
      );
      target = userMessages.item(userMessages.length - 1) ?? null;
    }

    if (!target) return false;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    let offsetTop = targetRect.top - viewportRect.top + viewport.scrollTop;

    // Heuristic: if message is tall (> 3 lines ~ 60px), scroll to show the bottom part
    if (targetRect.height > 80) {
      offsetTop += targetRect.height - 80;
    }

    viewport.scrollTo({
      top: offsetTop,
      behavior: "auto",
    });
    return true;
  }, []);

  useEffect(() => {
    if (!autoScroll || !isRunning || !lastUserMessageId) return undefined;

    let retries = 0;
    let rafId: number;

    const attemptScroll = () => {
      if (scrollToUserMessage(lastUserMessageId)) return;

      if (retries < 10) {
        retries++;
        rafId = requestAnimationFrame(attemptScroll);
      } else {
        scrollToBottom("auto");
      }
    };

    rafId = requestAnimationFrame(attemptScroll);

    return () => cancelAnimationFrame(rafId);
  }, [
    autoScroll,
    isRunning,
    lastUserMessageId,
    scrollToBottom,
    scrollToUserMessage,
  ]);

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
