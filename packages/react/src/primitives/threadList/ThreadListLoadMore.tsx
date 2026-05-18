"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadListLoadMore as useThreadListLoadMoreBehavior } from "@assistant-ui/core/react";

const useThreadListLoadMore = () => {
  const { loadMore, disabled } = useThreadListLoadMoreBehavior();
  if (disabled) return null;
  return loadMore;
};

export namespace ThreadListPrimitiveLoadMore {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadListLoadMore>;
}

export const ThreadListPrimitiveLoadMore = createActionButton(
  "ThreadListPrimitive.LoadMore",
  useThreadListLoadMore,
);
