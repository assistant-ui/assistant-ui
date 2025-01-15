"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useMessageUtilsStore } from "../../context/react/MessageContext";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

const useIsHoveringRef = () => {
  const messageUtilsStore = useMessageUtilsStore();
  const callbackRef = useCallback(
    (el: HTMLElement) => {
      const setIsHovering = messageUtilsStore.getState().setIsHovering;

      const handleMouseEnter = () => {
        setIsHovering(true);
      };
      const handleMouseLeave = () => {
        setIsHovering(false);
      };

      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
        setIsHovering(false);
      };
    },
    [messageUtilsStore],
  );

  return useManagedRef(callbackRef);
};

export namespace MessagePrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const MessagePrimitiveRoot = forwardRef<
  MessagePrimitiveRoot.Element,
  MessagePrimitiveRoot.Props
>((props, forwardRef) => {
  const isHoveringRef = useIsHoveringRef();
  const ref = useComposedRefs<HTMLDivElement>(forwardRef, isHoveringRef);

  return <Primitive.div {...props} ref={ref} />;
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
