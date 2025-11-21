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
import { useOnResize } from "../../utils/hooks/useOnResize";
import { ThreadViewportSpacerProvider } from "./ThreadViewportSpacerContext";
import { THREAD_FOOTER_ATTR, THREAD_SPACER_ATTR } from "./threadDataAttributes";

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

type Measurements = {
  footerHeight: number;
  viewportHeight: number;
  spacerHeight: number;
  /**
   * Track whether we have an explicit spacer measurement; otherwise fall back
   * to `viewportHeight - footerHeight` so layouts work even without a spacer.
   */
  spacerMeasured: boolean;
};

type AppliedMeasurements = {
  footerHeight: number;
  viewportHeight: number;
  spacerHeight: number;
  totalOffset: number;
  bottomOffset: number;
};

const computeAppliedMeasurements = (
  measurements: Measurements,
): AppliedMeasurements => {
  const footerHeight = Math.max(0, Math.round(measurements.footerHeight));
  const viewportHeight = Math.max(0, Math.round(measurements.viewportHeight));
  const fallbackSpacerHeight = Math.max(0, viewportHeight - footerHeight);
  const effectiveSpacerHeight = measurements.spacerMeasured
    ? measurements.spacerHeight
    : fallbackSpacerHeight;
  const spacerHeight = Math.max(0, Math.round(effectiveSpacerHeight));
  const totalOffset = footerHeight + spacerHeight;
  const bottomOffset = Math.max(0, viewportHeight - totalOffset);

  return {
    footerHeight,
    viewportHeight,
    spacerHeight,
    totalOffset,
    bottomOffset,
  };
};

const syncMeasurementsToCSSVars = (
  viewport: HTMLElement,
  measurements: AppliedMeasurements,
  lastApplied: AppliedMeasurements,
  setLastApplied: (next: AppliedMeasurements) => void,
) => {
  const noChange =
    lastApplied.viewportHeight === measurements.viewportHeight &&
    lastApplied.footerHeight === measurements.footerHeight &&
    lastApplied.spacerHeight === measurements.spacerHeight &&
    lastApplied.totalOffset === measurements.totalOffset &&
    lastApplied.bottomOffset === measurements.bottomOffset;

  if (noChange) return;

  viewport.style.setProperty(
    "--aui-thread-viewport-height",
    `${measurements.viewportHeight}px`,
  );
  viewport.style.setProperty(
    "--aui-thread-footer-height",
    `${measurements.footerHeight}px`,
  );
  viewport.style.setProperty(
    "--aui-thread-spacer-height",
    `${measurements.spacerHeight}px`,
  );
  viewport.style.setProperty(
    "--aui-thread-bottom-offset",
    `${measurements.bottomOffset}px`,
  );
  viewport.style.setProperty(
    "--aui-thread-total-offset",
    `${measurements.totalOffset}px`,
  );

  setLastApplied(measurements);
};

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ autoScroll = true, children, ...rest }, forwardedRef) => {
  const viewportRef = useRef<ThreadPrimitiveViewport.Element>(null);
  const measurementsRef = useRef<Measurements>({
    footerHeight: DEFAULT_COMPOSER_HEIGHT,
    viewportHeight: 0,
    spacerHeight: 0,
    spacerMeasured: false,
  });
  const lastAppliedRef = useRef<AppliedMeasurements>({
    footerHeight: DEFAULT_COMPOSER_HEIGHT,
    spacerHeight: 0,
    bottomOffset: 0,
    totalOffset: 0,
    viewportHeight: 0,
  });

  const setMeasurementCSSVars = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const next = computeAppliedMeasurements(measurementsRef.current);
    syncMeasurementsToCSSVars(
      viewport,
      next,
      lastAppliedRef.current,
      (applied) => {
        lastAppliedRef.current = applied;
      },
    );
  }, []);

  const updateViewportHeight = useCallback(
    (height: number) => {
      const normalizedHeight = Math.max(0, Math.round(height));
      if (measurementsRef.current.viewportHeight === normalizedHeight) return;
      measurementsRef.current.viewportHeight = normalizedHeight;
      setMeasurementCSSVars();
    },
    [setMeasurementCSSVars],
  );

  const updateFooterHeight = useCallback(
    (height: number) => {
      const normalizedHeight = Math.max(0, Math.round(height));
      if (measurementsRef.current.footerHeight === normalizedHeight) return;
      measurementsRef.current.footerHeight = normalizedHeight;
      setMeasurementCSSVars();
    },
    [setMeasurementCSSVars],
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
      setMeasurementCSSVars();
    },
    [setMeasurementCSSVars],
  );

  const trackIsAtBottomRef = useThreadViewportIsAtBottom(viewportRef);
  const registerLastUserMessageScrollAnchor = useScrollToLastUserMessage(
    viewportRef,
    autoScroll,
  );
  const viewportResizeRef = useOnResize(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    updateViewportHeight(viewportEl.clientHeight);

    const footerEl = viewportEl.querySelector<HTMLElement>(
      `[${THREAD_FOOTER_ATTR}]`,
    );
    if (footerEl) {
      updateFooterHeight(footerEl.getBoundingClientRect().height);
    }

    const spacerEl = viewportEl.querySelector<HTMLElement>(
      `[${THREAD_SPACER_ATTR}]`,
    );
    if (spacerEl) {
      setSpacerMeasurement(spacerEl.getBoundingClientRect().height);
    }
  });
  const spacerRef = useRef<HTMLElement | null>(null);
  const spacerResizeRef = useOnResize(() => {
    const spacerEl = spacerRef.current;
    if (!spacerEl) return;
    setSpacerMeasurement(spacerEl.getBoundingClientRect().height);
  });
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
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    viewportEl.scrollTo({
      top: viewportEl.scrollHeight,
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
    setMeasurementCSSVars();
  }, [setMeasurementCSSVars]);

  return (
    <ThreadViewportSpacerProvider value={{ registerSpacer }}>
      <ThreadViewportAnchorProvider
        value={{ registerLastUserMessageScrollAnchor }}
      >
        <Primitive.div {...rest} ref={ref}>
          {children}
        </Primitive.div>
      </ThreadViewportAnchorProvider>
    </ThreadViewportSpacerProvider>
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
