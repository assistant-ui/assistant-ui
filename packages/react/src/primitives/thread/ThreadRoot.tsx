import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";

export namespace ThreadPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRoot.Element,
  ThreadPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
