"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { parseCssLength } from "../thread/topAnchor/topAnchorUtils";

type ThreadViewportStore = NonNullable<
  ReturnType<typeof useThreadViewportStore>
>;

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
 * Predicate: this user message is the anchor target of an in-flight top-turn
 * (second-to-last message after the first turn, with the last being an
 * assistant response).
 */
const useIsTopAnchorUser = (turnAnchor: "top" | "bottom") => {
  return useAuiState(
    (s) =>
      turnAnchor === "top" &&
      s.message.role === "user" &&
      s.message.index > 0 &&
      s.message.index === s.thread.messages.length - 2 &&
      s.thread.messages.at(-1)?.role === "assistant",
  );
};

/**
 * Predicate: this assistant message is the streaming response paired with the
 * preceding user message under top-turn anchoring.
 */
const useIsTopAnchorTarget = (turnAnchor: "top" | "bottom") => {
  return useAuiState(
    (s) =>
      turnAnchor === "top" &&
      s.message.isLast &&
      s.message.role === "assistant" &&
      s.message.index >= 1 &&
      s.thread.messages.at(s.message.index - 1)?.role === "user",
  );
};

/** Registers the user message as the top-anchor user reference element. */
const useTopAnchorUserRef = (
  active: boolean,
  threadViewportStore: ThreadViewportStore,
) => {
  const callback = useCallback(
    (el: HTMLElement) => {
      if (!active) return;
      return threadViewportStore.getState().registerAnchorElement(el);
    },
    [active, threadViewportStore],
  );

  return useManagedRef<HTMLElement>(callback);
};

/**
 * Registers the assistant message as the top-anchor target element. CSS-length
 * clamp config is parsed once at register time using the registered element's
 * computed style, then stored as numeric pixels.
 */
const useTopAnchorTargetRef = ({
  active,
  threadViewportStore,
}: {
  active: boolean;
  threadViewportStore: ThreadViewportStore;
}) => {
  const targetRefCallback = useCallback(
    (el: HTMLElement) => {
      if (!active) return;
      const state = threadViewportStore.getState();
      const clamp = state.topAnchorMessageClamp;

      return state.registerAnchorTargetElement(el, {
        tallerThan: parseCssLength(clamp.tallerThan, el),
        visibleHeight: parseCssLength(clamp.visibleHeight, el),
      });
    },
    [active, threadViewportStore],
  );

  return useManagedRef<HTMLElement>(targetRefCallback);
};

export namespace MessagePrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a message.
 *
 * This component provides the foundational wrapper for message content and handles
 * hover state management for the message. It automatically tracks when the user
 * is hovering over the message, which can be used by child components like action bars.
 *
 * When `turnAnchor="top"` is set on the viewport, this component automatically
 * registers itself as the top-anchor user message (when it's the previous user
 * message) or as the top-anchor target (when it's the streaming assistant
 * response). No additional component is required.
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
  const threadViewportStore = useThreadViewportStore();
  const turnAnchor = threadViewportStore.getState().turnAnchor;
  const isTopAnchorUser = useIsTopAnchorUser(turnAnchor);
  const isTopAnchorTarget = useIsTopAnchorTarget(turnAnchor);
  const topAnchorUserRef = useTopAnchorUserRef(
    isTopAnchorUser,
    threadViewportStore,
  );
  const topAnchorTargetRef = useTopAnchorTargetRef({
    active: isTopAnchorTarget,
    threadViewportStore,
  });
  const ref = useComposedRefs<HTMLDivElement>(
    forwardRef,
    isHoveringRef,
    topAnchorUserRef,
    topAnchorTargetRef,
  );
  const messageId = useAuiState((s) => s.message.id);

  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-message-id={messageId}
      data-aui-top-anchor-target={isTopAnchorTarget ? "" : undefined}
    />
  );
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
