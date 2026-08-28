"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  useCallback,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useComposedRefs } from "radix-ui/internal";
import {
  useThreadViewport,
  useThreadViewportStore,
} from "../../context/react/ThreadViewportContext";
import { parseCssLength } from "../thread/topAnchor/topAnchorUtils";

type ThreadViewportStore = NonNullable<
  ReturnType<typeof useThreadViewportStore>
>;

const useIsHoveringRef = () => {
  const aui = useAui();
  const message = useAuiState(() => aui.message);

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

const useIsTopAnchorUser = () => {
  const activeAnchorId = useThreadViewport((s) => s.topAnchorTurn?.anchorId);
  const isRunning = useAuiState("thread", (s) => s.isRunning);
  const messagesLength = useAuiState("thread", (s) => s.messages.length);
  const lastRole = useAuiState("thread", (s) => s.messages.at(-1)?.role);
  return useAuiState(
    "message",
    (s) =>
      s.role === "user" &&
      s.index > 0 &&
      s.index === messagesLength - 2 &&
      lastRole === "assistant" &&
      (s.id === activeAnchorId || isRunning),
  );
};

const useIsTopAnchorTarget = () => {
  const activeTargetId = useThreadViewport((s) => s.topAnchorTurn?.targetId);
  const isRunning = useAuiState("thread", (s) => s.isRunning);
  const messageIndex = useAuiState("message", (s) => s.index);
  const previousRole = useAuiState(
    "thread",
    (s) => s.messages.at(messageIndex - 1)?.role,
  );
  return useAuiState(
    "message",
    (s) =>
      s.isLast &&
      s.role === "assistant" &&
      s.index >= 1 &&
      previousRole === "user" &&
      (s.id === activeTargetId || isRunning),
  );
};

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

type MessagePrimitiveRootInternalProps = MessagePrimitiveRoot.Props & {
  forwardedRef: ForwardedRef<MessagePrimitiveRoot.Element>;
};

const MessagePrimitiveRootDefault = ({
  forwardedRef,
  ...props
}: MessagePrimitiveRootInternalProps) => {
  const isHoveringRef = useIsHoveringRef();
  const ref = useComposedRefs<HTMLDivElement>(forwardedRef, isHoveringRef);
  const messageId = useAuiState("message", (s) => s.id);

  return <Primitive.div {...props} ref={ref} data-message-id={messageId} />;
};

const MessagePrimitiveRootTopAnchor = ({
  forwardedRef,
  threadViewportStore,
  ...props
}: MessagePrimitiveRootInternalProps & {
  threadViewportStore: ThreadViewportStore;
}) => {
  const isHoveringRef = useIsHoveringRef();
  const isTopAnchorUser = useIsTopAnchorUser();
  const isTopAnchorTarget = useIsTopAnchorTarget();
  const topAnchorUserRef = useTopAnchorUserRef(
    isTopAnchorUser,
    threadViewportStore,
  );
  const topAnchorTargetRef = useTopAnchorTargetRef({
    active: isTopAnchorTarget,
    threadViewportStore,
  });
  const ref = useComposedRefs<HTMLDivElement>(
    forwardedRef,
    isHoveringRef,
    topAnchorUserRef,
    topAnchorTargetRef,
  );
  const messageId = useAuiState("message", (s) => s.id);

  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-message-id={messageId}
      data-aui-top-anchor-user={isTopAnchorUser ? "" : undefined}
      data-aui-top-anchor-target={isTopAnchorTarget ? "" : undefined}
    />
  );
};

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
>((props, forwardedRef) => {
  const threadViewportStore = useThreadViewportStore();
  // turnAnchor is initial-only viewport config (see ThreadViewportProvider).
  const turnAnchor = threadViewportStore.getState().turnAnchor;

  if (turnAnchor === "top") {
    return (
      <MessagePrimitiveRootTopAnchor
        {...props}
        forwardedRef={forwardedRef}
        threadViewportStore={threadViewportStore}
      />
    );
  }
  return <MessagePrimitiveRootDefault {...props} forwardedRef={forwardedRef} />;
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
