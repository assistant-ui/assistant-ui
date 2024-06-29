"use client";

import { createPortal } from "react-dom";
import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessageContext } from "../../context/react/MessageContext";

type MessagePrimitiveInProgressElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

export type MessagePrimitiveInProgressProps = PrimitiveSpanProps;

export const MessagePrimitiveInProgress = forwardRef<
  MessagePrimitiveInProgressElement,
  MessagePrimitiveInProgressProps
>((props, ref) => {
  const { useMessageUtils } = useMessageContext();

  const portalNode = useMessageUtils((s) => s.inProgressIndicator);
  return createPortal(<Primitive.span {...props} ref={ref} />, portalNode);
});

MessagePrimitiveInProgress.displayName = "MessagePrimitive.InProgress";
