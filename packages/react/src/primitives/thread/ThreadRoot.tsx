import { type ComponentRef, forwardRef } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import classNames from "classnames";
import { ScrollBar } from "../../ui/base/scroll-area";

export namespace ThreadPrimitiveRoot {
  export type Element = ComponentRef<typeof ScrollAreaPrimitive.Root>;
  export type Props = ScrollAreaPrimitive.ScrollAreaProps;
}

export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRoot.Element,
  ThreadPrimitiveRoot.Props
>(({ className, children, ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Root
      {...props}
      className={classNames("relative overflow-hidden", className)}
      ref={ref}
    >
      {children}
      <ScrollBar />
    </ScrollAreaPrimitive.Root>
  );
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
