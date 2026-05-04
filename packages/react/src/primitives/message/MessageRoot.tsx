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
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { scheduleAnchorTargetRegistration } from "../thread/topAnchor/scheduleAnchorTargetRegistration";

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

const useIsTopAnchorUser = () => {
  return useAuiState(
    (s) =>
      s.message.role === "user" &&
      s.message.index > 0 &&
      s.message.index === s.thread.messages.length - 2 &&
      s.thread.messages.at(-1)?.role === "assistant",
  );
};

const useIsTopAnchorTarget = () => {
  return useAuiState(
    (s) =>
      s.message.isLast &&
      s.message.role === "assistant" &&
      s.message.index >= 1 &&
      s.thread.messages.at(s.message.index - 1)?.role === "user",
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
      return scheduleAnchorTargetRegistration(el, threadViewportStore);
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
  const messageId = useAuiState((s) => s.message.id);

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
  const messageId = useAuiState((s) => s.message.id);

  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-message-id={messageId}
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
