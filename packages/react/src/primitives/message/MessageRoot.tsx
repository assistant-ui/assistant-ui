"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ElementRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

type MessagePrimitiveRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

const useIsHoveringRef = () => {
  const { useMessageUtils } = useMessageContext();

  const callbackRef = useCallback(
    (el: HTMLElement) => {
      const setIsHovering = useMessageUtils.getState().setIsHovering;

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
    [useMessageUtils],
  );

  return useManagedRef(callbackRef);
};

export type MessagePrimitiveRootProps = PrimitiveDivProps;

export const MessagePrimitiveRoot = forwardRef<
  MessagePrimitiveRootElement,
  MessagePrimitiveRootProps
>(({ onMouseEnter, onMouseLeave, ...rest }, forwardRef) => {
  const isHoveringRef = useIsHoveringRef();
  const ref = useComposedRefs<HTMLDivElement>(forwardRef, isHoveringRef);

  return <Primitive.div {...rest} ref={ref} />;
});

MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
