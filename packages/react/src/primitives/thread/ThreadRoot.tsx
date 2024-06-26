"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";

type ThreadPrimitiveRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export type ThreadPrimitiveRootProps = PrimitiveDivProps;

export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRootElement,
  ThreadPrimitiveRootProps
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
