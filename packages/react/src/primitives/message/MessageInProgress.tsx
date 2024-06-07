"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, useMemo } from "react";
import { useMessageContext } from "../../utils/context/useMessageContext";

type MessageInProgressElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageInProgressProps = PrimitiveDivProps;

export const MessageInProgress = forwardRef<
  MessageInProgressElement,
  MessageInProgressProps
>((props, ref) => {
  const { useMessage } = useMessageContext();

  useMemo(() => {
    useMessage
      .getState()
      .setInProgressIndicator(<Primitive.div {...props} ref={ref} />);
  }, [useMessage, props, ref]);

  return null;
});
