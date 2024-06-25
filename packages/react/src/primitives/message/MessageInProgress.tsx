"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ElementRef,
  forwardRef,
  useMemo,
  ComponentPropsWithoutRef,
} from "react";
import { useMessageContext } from "../../context/react/MessageContext";

type MessageInProgressElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

type MessageInProgressProps = PrimitiveSpanProps;

export const MessageInProgress = forwardRef<
  MessageInProgressElement,
  MessageInProgressProps
>((props, ref) => {
  const { useMessageUtils } = useMessageContext();

  useMemo(() => {
    useMessageUtils
      .getState()
      .setInProgressIndicator(<Primitive.span {...props} ref={ref} />);
  }, [useMessageUtils, props, ref]);

  return null;
});

MessageInProgress.displayName = "MessageInProgress";
