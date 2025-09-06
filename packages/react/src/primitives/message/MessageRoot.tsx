"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useAssistantApi, useAssistantState } from "../../context";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

const useIsHoveringRef = () => {
  const api = useAssistantApi();

  // TODO bug: putting isHovering in the message state means that the state is lost when the message is switched
  const messageId = useAssistantState(({ message }) => message.id);
  const callbackRef = useCallback(
    (el: HTMLElement) => {
      const message = api.message();

      const handleMouseEnter = () => {
        message.setIsHovering(true);
      };
      const handleMouseLeave = () => {
        message.setIsHovering(false);
      };

      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);

      if (el.matches(":hover")) message.setIsHovering(true);

      return () => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        message.setIsHovering(false);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, messageId],
  );

  return useManagedRef(callbackRef);
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
  const ref = useComposedRefs<HTMLDivElement>(forwardRef, isHoveringRef);

  return <Primitive.div {...props} ref={ref} />;
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
