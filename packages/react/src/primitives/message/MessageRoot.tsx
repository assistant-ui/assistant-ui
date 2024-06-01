"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef } from "react";
import { useMessageContext } from "../../utils/context/useMessageContext";

type MessageRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageRootProps = PrimitiveDivProps;

export const MessageRoot = forwardRef<MessageRootElement, MessageRootProps>(
  ({ onMouseEnter, onMouseLeave, ...rest }, ref) => {
    const { useMessage } = useMessageContext();
    const setIsHovering = useMessage((s) => s.setIsHovering);

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
