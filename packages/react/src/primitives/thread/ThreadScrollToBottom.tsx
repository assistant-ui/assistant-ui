"use client";

import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadScrollToBottom } from "../../primitive-hooks/thread/useThreadScrollToBottom";

export type ThreadPrimitiveScrollToBottomProps = ActionButtonProps<
  typeof useThreadScrollToBottom
>;

export const ThreadPrimitiveScrollToBottom = createActionButton(
  "ThreadPrimitive.ScrollToBottom",
  useThreadScrollToBottom,
);
