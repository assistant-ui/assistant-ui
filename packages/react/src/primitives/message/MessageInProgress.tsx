"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ElementRef,
  forwardRef,
  useMemo,
  ComponentPropsWithoutRef,
} from "react";
import { useMessageContext } from "../../context/react/MessageContext";

type MessagePrimitiveInProgressElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

export type MessagePrimitiveInProgressProps = PrimitiveSpanProps;

export const MessagePrimitiveInProgress = forwardRef<
  MessagePrimitiveInProgressElement,
  MessagePrimitiveInProgressProps
>((props, ref) => {
  const { useMessageUtils } = useMessageContext();

  useMemo(() => {
    useMessageUtils
      .getState()
      .setInProgressIndicator(<Primitive.span {...props} ref={ref} />);
  }, [useMessageUtils, props, ref]);

  return null;
});

MessagePrimitiveInProgress.displayName = "MessagePrimitive.InProgress";
