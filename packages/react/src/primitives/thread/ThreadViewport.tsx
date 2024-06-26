"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import {
  UseThreadViewportAutoScrollProps,
  useThreadViewportAutoScroll,
} from "../../primitive-hooks/thread/useThreadViewportAutoScroll";

type ThreadViewportElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadViewportProps = PrimitiveDivProps & UseThreadViewportAutoScrollProps;

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ autoScroll, onScroll, children, ...rest }, forwardedRef) => {
  const autoScrollRef = useThreadViewportAutoScroll<HTMLDivElement>({
    autoScroll,
  });

  const ref = useComposedRefs(forwardedRef, autoScrollRef);

  return (
    <Primitive.div {...rest} ref={ref}>
      {children}
    </Primitive.div>
  );
});

ThreadViewport.displayName = "ThreadViewport";
