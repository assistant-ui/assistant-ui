"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { type ComponentRef, forwardRef } from "react";
import { useThreadViewportAutoScroll } from "./useThreadViewportAutoScroll";
import { ThreadViewportProvider } from "../../context/providers/ThreadViewportProvider";
import classNames from "classnames";

export namespace ThreadPrimitiveViewport {
  export type Element = ComponentRef<typeof ScrollAreaPrimitive.Viewport>;
  export type Props = ScrollAreaPrimitive.ScrollAreaViewportProps & {
    autoScroll?: boolean | undefined;
  };
}

const ThreadPrimitiveViewportScrollable = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>(({ autoScroll, children, className, ...rest }, forwardedRef) => {
  const autoScrollRef = useThreadViewportAutoScroll<HTMLDivElement>({
    autoScroll,
  });

  const ref = useComposedRefs(forwardedRef, autoScrollRef);

  return (
    <ScrollAreaPrimitive.Viewport
      {...rest}
      ref={ref}
      className={classNames("h-full w-full rounded-[inherit]", className)}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
  );
});

export const ThreadPrimitiveViewport = forwardRef<
  ThreadPrimitiveViewport.Element,
  ThreadPrimitiveViewport.Props
>((props, ref) => {
  return (
    <ThreadViewportProvider>
      <ThreadPrimitiveViewportScrollable {...props} ref={ref} />
    </ThreadViewportProvider>
  );
});

ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";
