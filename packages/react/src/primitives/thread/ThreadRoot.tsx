"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useAui } from "@assistant-ui/store";

export namespace ThreadPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  /**
   * Props for the ThreadPrimitive.Root component.
   * Accepts all standard div element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a thread.
 *
 * This component serves as the foundational wrapper for all thread-related components.
 * It provides the basic structure and context needed for thread functionality.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Root>
 *   <ThreadPrimitive.Viewport>
 *     <ThreadPrimitive.Messages>
 *       {() => <MyMessage />}
 *     </ThreadPrimitive.Messages>
 *   </ThreadPrimitive.Viewport>
 * </ThreadPrimitive.Root>
 * ```
 */
export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRoot.Element,
  ThreadPrimitiveRoot.Props
>((props, ref) => {
  const aui = useAui();

  useEscapeKeydown((event) => {
    if (aui.thread.getState().speech == null) return;
    event.preventDefault();
    aui.thread.stopSpeaking();
  });

  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
