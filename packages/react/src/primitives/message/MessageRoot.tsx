"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";
import { ThreadPrimitiveViewportSlack } from "../thread/ThreadViewportSlack";

const useIsHoveringRef = () => {
  const aui = useAui();
  const message = useAuiState(() => aui.message());

  const callbackRef = useCallback(
    (el: HTMLElement) => {
      const handleMouseEnter = () => {
        message.setIsHovering(true);
      };
      const handleMouseLeave = () => {
        message.setIsHovering(false);
      };

      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);

      if (el.matches(":hover")) {
        // TODO this is needed for SSR to work, figure out why
        queueMicrotask(() => message.setIsHovering(true));
      }

      return () => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        message.setIsHovering(false);
      };
    },
    [message],
  );

  return useManagedRef(callbackRef);
};

/**
 * Hook that registers the anchor user message as a content inset.
 * Only registers if: user message, at index messages.length-2, and last message is assistant.
 */
const useMessageViewportRef = () => {
  const turnAnchor = useThreadViewport((s) => s.turnAnchor);
  const registerUserHeight = useThreadViewport(
    (s) => s.registerUserMessageHeight,
  );

  // inset rules:
  // - the previous user message before the last assistant message registers its full height
  const shouldRegisterAsInset = useAuiState(
    (s) =>
      turnAnchor === "top" &&
      s.message.role === "user" &&
      s.message.index === s.thread.messages.length - 2 &&
      s.thread.messages.at(-1)?.role === "assistant",
  );

  const getHeight = useCallback((el: HTMLElement) => el.offsetHeight, []);

  return useSizeHandle(
    shouldRegisterAsInset ? registerUserHeight : null,
    getHeight,
  );
};

export namespace MessagePrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  /**
   * Props for the MessagePrimitive.Root component.
   * Accepts all standard div element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a message.
 *
 * This component provides the foundational wrapper for message content and handles
 * hover state management for the message. It automatically tracks when the user
 * is hovering over the message, which can be used by child components like action bars.
 *
 * When `turnAnchor="top"` is set on the viewport, this component
 * registers itself as the scroll anchor if it's the last user message.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Root>
 *   <MessagePrimitive.Content />
 *   <ActionBarPrimitive.Root>
 *     <ActionBarPrimitive.Copy />
 *     <ActionBarPrimitive.Edit />
 *   </ActionBarPrimitive.Root>
 * </MessagePrimitive.Root>
 * ```
 */
export const MessagePrimitiveRoot = forwardRef<
  MessagePrimitiveRoot.Element,
  MessagePrimitiveRoot.Props
>((props, forwardRef) => {
  const isHoveringRef = useIsHoveringRef();
  const anchorUserMessageRef = useMessageViewportRef();
  const ref = useComposedRefs<HTMLDivElement>(
    forwardRef,
    isHoveringRef,
    anchorUserMessageRef,
  );

  return (
    <ThreadPrimitiveViewportSlack>
      <Primitive.div {...props} ref={ref} />
    </ThreadPrimitiveViewportSlack>
  );
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
