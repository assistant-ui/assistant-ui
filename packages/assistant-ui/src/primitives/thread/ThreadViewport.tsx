"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";

type ThreadViewportElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadViewportProps = PrimitiveDivProps;

const ANCHOR_CSS = `[data-aui-thread-viewport] * {
  overflow-anchor: none;
}`;

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ children, ...rest }, forwardedRef) => {
  const divRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, divRef);

  useLayoutEffect(() => {});

  return (
    <Primitive.div {...rest} data-aui-thread-viewport ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: ANCHOR_CSS }} />
      {children}
      <div
        style={{ overflowAnchor: "auto", height: "5px", marginTop: "-5px" }}
      />
    </Primitive.div>
  );
});
