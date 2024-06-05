"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, useMemo } from "react";
import { useMessageContext } from "../../utils/context/useMessageContext";

type MessageLoadingElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessageLoadingProps = PrimitiveDivProps;

export const MessageLoading = forwardRef<
  MessageLoadingElement,
  MessageLoadingProps
>((props, ref) => {
  const { useMessage } = useMessageContext();

  useMemo(() => {
    useMessage
      .getState()
      .setLoadingIndicator(<Primitive.div {...props} ref={ref} />);
  }, [useMessage, props, ref]);

  return null;
});
