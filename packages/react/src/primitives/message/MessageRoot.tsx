"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageContext } from "../../utils/context/MessageContext";

type MessageRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageRootProps = PrimitiveDivProps;

export const MessageRoot = forwardRef<MessageRootElement, MessageRootProps>(
  ({ onMouseEnter, onMouseLeave, ...rest }, ref) => {
    const setIsHovering = useMessageContext(
      "Message.Root",
      (s) => s.setIsHovering,
    );

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
