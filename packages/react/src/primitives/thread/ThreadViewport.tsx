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
import { useThreadViewportIsAtBottom } from "./useThreadViewportIsAtBottom";
import { ThreadViewportAnchorProvider } from "./ThreadViewportAnchorContext";
import { useScrollToLastUserMessage } from "./useScrollToLastUserMessage";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";

import { ThreadViewportComposerProvider } from "./ThreadViewportComposerContext";
import { ThreadViewportSpacerProvider } from "./ThreadViewportSpacerContext";

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
  const measurementsRef = useRef({
    composerHeight: DEFAULT_COMPOSER_HEIGHT,
    viewportHeight: 0,
    spacerHeight: 0,
    spacerMeasured: false,
  });

  const applyMeasurementsToCSS = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const composerHeight = Math.max(
      0,
      Math.round(measurementsRef.current.composerHeight),
    );
    const viewportHeight = Math.max(
      0,
      Math.round(measurementsRef.current.viewportHeight),
    );
    const fallbackSpacerHeight = Math.max(0, viewportHeight - composerHeight);
    const effectiveSpacerHeight = measurementsRef.current.spacerMeasured
      ? measurementsRef.current.spacerHeight
      : fallbackSpacerHeight;
    const spacerHeight = Math.max(0, Math.round(effectiveSpacerHeight));
    const totalOffset = composerHeight + spacerHeight;
    const bottomOffset = Math.max(0, viewportHeight - totalOffset);

    viewport.style.setProperty(
      "--aui-thread-viewport-height",
      `${viewportHeight}px`,
    );
    viewport.style.setProperty(
      "--aui-thread-composer-height",
      `${composerHeight}px`,
    );
    viewport.style.setProperty(
      "--aui-thread-spacer-height",
      `${spacerHeight}px`,
    );
    viewport.style.setProperty(
      "--aui-thread-bottom-offset",
      `${bottomOffset}px`,
    );
    viewport.style.setProperty("--aui-thread-total-offset", `${totalOffset}px`);
  }, []);

  const updateViewportHeight = useCallback(
    (height: number) => {
      const normalizedHeight = Math.max(0, Math.round(height));
      if (measurementsRef.current.viewportHeight === normalizedHeight) return;
      measurementsRef.current.viewportHeight = normalizedHeight;
      applyMeasurementsToCSS();
    },
    [applyMeasurementsToCSS],
  );

  const updateComposerHeight = useCallback(
    (height: number) => {
      const normalizedHeight = Math.max(0, Math.round(height));
      if (measurementsRef.current.composerHeight === normalizedHeight) return;
      measurementsRef.current.composerHeight = normalizedHeight;
      applyMeasurementsToCSS();
    },
    [applyMeasurementsToCSS],
  );

  const setSpacerMeasurement = useCallback(
    (height: number | null) => {
      const measured = height !== null;
      const normalizedHeight = measured ? Math.max(0, Math.round(height!)) : 0;
      if (
        measurementsRef.current.spacerMeasured === measured &&
        measurementsRef.current.spacerHeight === normalizedHeight
      ) {
        return;
      }
      measurementsRef.current.spacerMeasured = measured;
      measurementsRef.current.spacerHeight = normalizedHeight;
      applyMeasurementsToCSS();
    },
    [applyMeasurementsToCSS],
  );

  const trackIsAtBottomRef = useThreadViewportIsAtBottom(viewportRef);
  const registerLastUserMessageAnchor = useScrollToLastUserMessage(
    viewportRef,
    autoScroll,
  );
  const viewportResizeRef = useOnResizeContent(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    updateViewportHeight(viewport.clientHeight);
  });
  const composerRef = useRef<HTMLElement | null>(null);
  const spacerRef = useRef<HTMLElement | null>(null);

  const composerResizeRef = useOnResizeContent(() => {
    const composer = composerRef.current;
    if (!composer) return;
    updateComposerHeight(composer.getBoundingClientRect().height);
  });
  const spacerResizeRef = useOnResizeContent(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    setSpacerMeasurement(spacer.getBoundingClientRect().height);
  });

  const registerComposer = useCallback(
    (node: HTMLElement | null) => {
      composerResizeRef(node);
      composerRef.current = node;
      const height = node
        ? node.getBoundingClientRect().height
        : DEFAULT_COMPOSER_HEIGHT;

      updateComposerHeight(height);
    },
    [composerResizeRef, updateComposerHeight],
  );
  const registerSpacer = useCallback(
    (node: HTMLElement | null) => {
      spacerResizeRef(node);
      spacerRef.current = node;
      if (!node) {
        setSpacerMeasurement(null);
        return;
      }
      setSpacerMeasurement(node.getBoundingClientRect().height);
    },
    [setSpacerMeasurement, spacerResizeRef],
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

  useLayoutEffect(() => {
    applyMeasurementsToCSS();
  }, [applyMeasurementsToCSS]);

  return (
    <ThreadViewportComposerProvider value={{ registerComposer }}>
      <ThreadViewportSpacerProvider value={{ registerSpacer }}>
        <ThreadViewportAnchorProvider value={{ registerLastUserMessageAnchor }}>
          <Primitive.div {...rest} ref={ref}>
            {children}
          </Primitive.div>
        </ThreadViewportAnchorProvider>
      </ThreadViewportSpacerProvider>
    </ThreadViewportComposerProvider>
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
