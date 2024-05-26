"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { useAssistantContext } from "../../utils/context/AssistantContext";

type ThreadScrollToBottomElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;

type ThreadScrollToBottomProps = PrimitiveButtonProps;

export const ThreadScrollToBottom = forwardRef<
  ThreadScrollToBottomElement,
  ThreadScrollToBottomProps
>(({ onClick, ...rest }, ref) => {
  const { useThread } = useAssistantContext();

  const isAtBottom = useThread((s) => s.isAtBottom);
  const handleScrollToBottom = () => {
    const thread = useThread.getState();
    thread.scrollToBottom();
  };

  if (isAtBottom) return null;

  return (
    <Primitive.button
      {...rest}
      ref={ref}
      onClick={composeEventHandlers(onClick, handleScrollToBottom)}
    />
  );
});
