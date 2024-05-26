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

type ThreadViewportProps = PrimitiveDivProps & {
  autoScroll?: boolean;
};

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ autoScroll = true, onScroll, children, ...rest }, forwardedRef) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const divRef = useRef<HTMLDivElement>(null);
  const ref = useComposedRefs(forwardedRef, divRef);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const firstRenderRef = useRef(true);
  const scrollToBottom = () => {
    const div = messagesEndRef.current;
    if (!div || !autoScroll) return;

    const behavior = firstRenderRef.current ? "instant" : "auto";
    firstRenderRef.current = false;

    div.scrollIntoView({ behavior });
  };

  useOnResizeContent(divRef, () => {
    if (!isAtBottom) return;
    scrollToBottom();
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
      <div ref={messagesEndRef} />
    </Primitive.div>
  );
});
