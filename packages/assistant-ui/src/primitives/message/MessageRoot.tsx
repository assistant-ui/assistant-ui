"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";

type MessageRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageRootProps = PrimitiveDivProps;

export const MessageRoot = forwardRef<MessageRootElement, MessageRootProps>(
  ({ ...rest }, ref) => {
    return <Primitive.div {...rest} ref={ref} />;
  },
);
