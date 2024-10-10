"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";

/**
 * @deprecated Use `ThreadPrimitive.Root.Props` instead. This will be removed in 0.6.
 */
export type ThreadPrimitiveRootProps = ThreadPrimitiveRoot.Props;

export namespace ThreadPrimitiveRoot {
  export type Element = ElementRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRoot.Element,
  ThreadPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
