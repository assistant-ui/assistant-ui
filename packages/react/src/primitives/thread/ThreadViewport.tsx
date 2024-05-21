"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef, useRef, useState } from "react";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";

type ThreadViewportElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadViewportProps = PrimitiveDivProps;

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ onScroll, children, ...rest }, forwardedRef) => {
  const divRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, divRef);

  const [isAtBottom, setIsAtBottom] = useState(true);

  useOnResizeContent(divRef, () => {
    const div = divRef.current;
    if (!div || !isAtBottom) return;

    div.scrollTop = div.scrollHeight;
  });

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    setIsAtBottom(div.scrollHeight - div.scrollTop <= div.clientHeight + 50);
  };

  return (
    <Primitive.div
      {...rest}
      onScroll={composeEventHandlers(onScroll, handleScroll)}
      ref={ref}
    >
      {children}
    </Primitive.div>
  );
});
