"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadScrollToBottom } from "../../primitive-hooks/thread/useThreadScrollToBottom";

/**
 * @deprecated Use `ThreadPrimitive.ScrollToBottom.Props` instead. This will be removed in 0.6.
 */
export type ThreadPrimitiveScrollToBottomProps =
  ThreadPrimitiveScrollToBottom.Props;

export namespace ThreadPrimitiveScrollToBottom {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadScrollToBottom>;
}

export const ThreadPrimitiveScrollToBottom = createActionButton(
  "ThreadPrimitive.ScrollToBottom",
  useThreadScrollToBottom,
);
