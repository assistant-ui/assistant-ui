import type { ComponentProps, ReactNode } from "react";
import type { Box } from "ink";
import { Pressable } from "../internal/Pressable";
import { useThreadViewport } from "./useThreadViewport";

export type ThreadScrollToBottomProps = ComponentProps<typeof Box> & {
  children: ReactNode;
  behavior?: "auto" | "instant" | undefined;
};

export const ThreadScrollToBottom = ({
  children,
  behavior: _behavior,
  ...boxProps
}: ThreadScrollToBottomProps) => {
  const viewport = useThreadViewport();

  if (viewport.state.isAtBottom) return null;

  return (
    <Pressable onPress={viewport.actions.scrollToBottom} {...boxProps}>
      {children}
    </Pressable>
  );
};

ThreadScrollToBottom.displayName = "ThreadPrimitive.ScrollToBottom";

export namespace ThreadScrollToBottom {
  export type Props = ThreadScrollToBottomProps;
}
