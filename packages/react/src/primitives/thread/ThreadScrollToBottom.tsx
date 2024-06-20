"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useThreadContext } from "../../context/ThreadContext";

type ThreadScrollToBottomElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ThreadScrollToBottomProps = PrimitiveButtonProps;

export const ThreadScrollToBottom = forwardRef<
  ThreadScrollToBottomElement,
  ThreadScrollToBottomProps
>(({ onClick, ...rest }, ref) => {
  const { useViewport } = useThreadContext();

  const isAtBottom = useViewport((s) => s.isAtBottom);
  const handleScrollToBottom = () => {
    useViewport.getState().scrollToBottom();
  };

  return (
    <Primitive.button
      {...rest}
      disabled={isAtBottom}
      ref={ref}
      onClick={composeEventHandlers(onClick, handleScrollToBottom)}
    />
  );
});

ThreadScrollToBottom.displayName = "ThreadScrollToBottom";
