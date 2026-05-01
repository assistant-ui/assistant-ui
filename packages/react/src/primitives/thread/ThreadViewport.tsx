"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useThreadViewportAutoScroll } from "./useThreadViewportAutoScroll";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import {
  useThreadViewport,
  useThreadViewportStore,
} from "../../context/react/ThreadViewportContext";
import { useTopAnchorReserve } from "./topAnchor/useTopAnchorReserve";

export namespace ThreadPrimitiveViewport {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     *
     * Default false if `turnAnchor` is "top", otherwise defaults to true.
     */
    autoScroll?: boolean | undefined;

    /**
     * Controls scroll anchoring behavior for new messages.
     * - "bottom" (default): Messages anchor at the bottom, classic chat behavior.
     * - "top": New user messages anchor at the top of the viewport for a focused reading experience.
     */
    turnAnchor?: "top" | "bottom" | undefined;

    /**
     * Clamps tall user messages so the assistant response stays in view.
     *
     * @default { tallerThan: "10em", visibleHeight: "6em" }
     */
    topAnchorMessageClamp?: {
      /**
       * Clamp messages taller than this. Supports `px`, `em`, and `rem`.
       *
       * @default "10em"
       */
      tallerThan?: string;
      /**
       * Visible portion of clamped messages. Supports `px`, `em`, and `rem`.
       *
       * @default "6em"
       */
      visibleHeight?: string;
    };

    /**
     * Whether to scroll to bottom when a new run starts.
     *
     * Defaults to true.
     */
    scrollToBottomOnRunStart?: boolean | undefined;

    /**
     * Whether to scroll to bottom when thread history is first loaded.
     *
     * Defaults to true.
     */
    scrollToBottomOnInitialize?: boolean | undefined;

    /**
     * Whether to scroll to bottom when switching to a different thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };
}

const useViewportSizeRef = () => {
  const register = useThreadViewport((s) => s.registerViewport);
  const getHeight = useCallback((el: HTMLElement) => el.clientHeight, []);
  return useSizeHandle(register, getHeight);
};

const useViewportElementRef = () => {
  const registerViewportElement = useThreadViewport(
    (s) => s.registerViewportElement,
  );

  return useManagedRef(registerViewportElement);
};

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(
  (
    {
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
      children,
      ...rest
    },
    forwardedRef,
  ) => {
    const autoScrollRef = useThreadViewportAutoScroll<HTMLDivElement>({
      autoScroll,
      scrollToBottomOnRunStart,
      scrollToBottomOnInitialize,
      scrollToBottomOnThreadSwitch,
    });
    const viewportSizeRef = useViewportSizeRef();
    const viewportElementRef = useViewportElementRef();
    const threadViewportStore = useThreadViewportStore();
    const turnAnchor = threadViewportStore.getState().turnAnchor;
    useTopAnchorReserve(turnAnchor === "top");
    const ref = useComposedRefs(
      forwardedRef,
      autoScrollRef,
      viewportSizeRef,
      viewportElementRef,
    );

    return (
      <Primitive.div {...rest} ref={ref}>
        {children}
      </Primitive.div>
    );
  },
);

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
 * <ThreadPrimitive.Viewport turnAnchor="top">
 *   <ThreadPrimitive.Messages>
 *     {() => <MyMessage />}
 *   </ThreadPrimitive.Messages>
 * </ThreadPrimitive.Viewport>
 * ```
 */
export const ThreadPrimitiveViewport = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ turnAnchor, topAnchorMessageClamp, ...props }, ref) => {
  return (
    <ThreadPrimitiveViewportProvider
      options={{ turnAnchor, topAnchorMessageClamp }}
    >
      <ThreadPrimitiveViewportScrollable {...props} ref={ref} />
    </ThreadPrimitiveViewportProvider>
  );
});

ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";
