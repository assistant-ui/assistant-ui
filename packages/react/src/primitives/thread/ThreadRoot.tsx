"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  useEffect,
} from "react";
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
 * While this component is mounted, an unhandled Escape keydown stops active speech, even if
 * the action bar that started it is no longer mounted.
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || aui.thread.source === null) return;
      if (aui.thread.getState().speech == null) return;
      event.preventDefault();
      try {
        aui.thread.stopSpeaking();
      } catch (error) {
        // getState() is the last rendered snapshot, so speech can finish before this call.
        if (
          !(error instanceof Error) ||
          error.message !== "No message is being spoken"
        ) {
          throw error;
        }
      }
    };

    // Bubble phase lets capture-phase Escape handlers consume the event first.
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aui]);

  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
