"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";

type ThreadRootElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ThreadRootProps = PrimitiveButtonProps;

// TODO

export const ThreadScrollToBottom = forwardRef<
  ThreadRootElement,
  ThreadRootProps
>((props, ref) => {
  return <Primitive.button {...props} ref={ref} />;
});
