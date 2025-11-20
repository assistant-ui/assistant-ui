"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
  useRef,
  useState,
} from "react";
import { ThreadViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useThreadViewportIsAtBottom } from "./useThreadViewportIsAtBottom";
import { ThreadViewportAnchorProvider } from "./ThreadViewportAnchorContext";
import { useScrollToLastUserMessage } from "./useScrollToLastUserMessage";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";

import { ThreadViewportComposerProvider } from "./ThreadViewportComposerContext";
import {
  ThreadLayoutProvider,
  type ThreadLayoutState,
} from "./useThreadLayout";

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

const DEFAULT_COMPOSER_HEIGHT = 150;

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ autoScroll = true, children, ...rest }, forwardedRef) => {
  const viewportRef = useRef<ThreadPrimitiveViewport.Element>(null);
  const [layout, setLayout] = useState<ThreadLayoutState>({
    composerHeight: DEFAULT_COMPOSER_HEIGHT,
    viewportHeight: 0,
  });

  const setComposerHeight = useCallback((height: number) => {
    setLayout((prev) => {
      return prev.composerHeight === height
        ? prev
        : { ...prev, composerHeight: height };
    });
  }, []);

  const setViewportHeight = useCallback((height: number) => {
    setLayout((prev) => {
      return prev.viewportHeight === height
        ? prev
        : { ...prev, viewportHeight: height };
    });
  }, []);

  const trackIsAtBottomRef = useThreadViewportIsAtBottom(viewportRef);
  const registerLastUserMessageAnchor = useScrollToLastUserMessage(
    viewportRef,
    autoScroll,
  );
  const viewportResizeRef = useOnResizeContent(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setViewportHeight(viewport.clientHeight);
  });
  const composerRef = useRef<HTMLElement | null>(null);

  const composerResizeRef = useOnResizeContent(() => {
    const composer = composerRef.current;
    if (!composer) return;
    setComposerHeight(composer.getBoundingClientRect().height);
  });

  const registerComposer = useCallback(
    (node: HTMLElement | null) => {
      composerResizeRef(node);
      composerRef.current = node;
      const height = node
        ? node.getBoundingClientRect().height
        : DEFAULT_COMPOSER_HEIGHT;

      setComposerHeight(height);
    },
    [composerResizeRef, setComposerHeight],
  );

  useOnScrollToBottom(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "auto",
    });
  });

  const ref = useComposedRefs<ThreadPrimitiveViewport.Element>(
    forwardedRef,
    viewportRef,
    trackIsAtBottomRef,
    viewportResizeRef,
  );

  return (
    <ThreadLayoutProvider value={layout}>
      <ThreadViewportComposerProvider value={{ registerComposer }}>
        <ThreadViewportAnchorProvider value={{ registerLastUserMessageAnchor }}>
          <Primitive.div {...rest} ref={ref}>
            {children}
          </Primitive.div>
        </ThreadViewportAnchorProvider>
      </ThreadViewportComposerProvider>
    </ThreadLayoutProvider>
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
 * When customizing message layouts, ensure you keep the sentinel rendered by
 * `ThreadPrimitive.Messages` (or supply an equivalent marker) so the viewport
 * can reliably locate the last user message for auto-scroll.
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
