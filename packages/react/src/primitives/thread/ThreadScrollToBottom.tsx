"use client";

import { forwardRef } from "react";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";

type ThreadScrollToBottomElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ThreadScrollToBottomProps = PrimitiveButtonProps;

// TODO

export const ThreadScrollToBottom = forwardRef<
  ThreadScrollToBottomElement,
  ThreadScrollToBottomProps
>((props, ref) => {
  return <Primitive.button {...props} ref={ref} />;
});
