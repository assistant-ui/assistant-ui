"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessageContext } from "../../context/MessageContext";

type MessageRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageRootProps = PrimitiveDivProps;

export const MessageRoot = forwardRef<MessageRootElement, MessageRootProps>(
  ({ onMouseEnter, onMouseLeave, ...rest }, ref) => {
    const { useMessageUtils } = useMessageContext();
    const setIsHovering = useMessageUtils((s) => s.setIsHovering);

    const handleMouseEnter = () => {
      setIsHovering(true);
    };
    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    return (
      <Primitive.div
        {...rest}
        ref={ref}
        onMouseEnter={composeEventHandlers(onMouseEnter, handleMouseEnter)}
        onMouseLeave={composeEventHandlers(onMouseLeave, handleMouseLeave)}
      />
    );
  },
);

MessageRoot.displayName = "MessageRoot";
