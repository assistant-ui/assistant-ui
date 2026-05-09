"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";

export namespace ThreadPrimitiveViewportFooter {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * A footer container that measures its height for scroll calculations.
 *
 * This component measures its height and provides it to the viewport context
 * so the auto-scroll system can account for any sticky footer overlapping the
 * message list.
 *
 * Multiple ViewportFooter components can be used - their heights are summed.
 *
 * Typically used with `className="sticky bottom-0"` to keep the footer
 * visible at the bottom of the viewport while scrolling.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Viewport>
 *   <ThreadPrimitive.Messages>
 *     {() => <MyMessage />}
 *   </ThreadPrimitive.Messages>
 *   <ThreadPrimitive.ViewportFooter className="sticky bottom-0">
 *     <Composer />
 *   </ThreadPrimitive.ViewportFooter>
 * </ThreadPrimitive.Viewport>
 * ```
 */
export const ThreadPrimitiveViewportFooter = forwardRef<
  ThreadPrimitiveViewportFooter.Element,
  ThreadPrimitiveViewportFooter.Props
>((props, forwardedRef) => {
  const register = useThreadViewport((s) => s.registerContentInset);
  const getHeight = useCallback((el: HTMLElement) => {
    const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
    return el.offsetHeight + marginTop;
  }, []);

  const resizeRef = useSizeHandle(register, getHeight);

  const ref = useComposedRefs(forwardedRef, resizeRef);

  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveViewportFooter.displayName = "ThreadPrimitive.ViewportFooter";
