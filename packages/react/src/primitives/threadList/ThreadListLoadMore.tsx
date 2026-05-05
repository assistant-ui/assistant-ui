"use client";

import type {
  ActionButtonElement,
  ActionButtonProps,
} from "../../utils/createActionButton";
import { forwardRef } from "react";
import { Primitive } from "../../utils/Primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useThreadListLoadMore as useThreadListLoadMoreBehavior } from "@assistant-ui/core/react";

export namespace ThreadListPrimitiveLoadMore {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<() => void>;
}

export const ThreadListPrimitiveLoadMore = forwardRef<
  ThreadListPrimitiveLoadMore.Element,
  ThreadListPrimitiveLoadMore.Props
>(({ onClick, disabled: disabledProp, ...props }, forwardedRef) => {
  const { loadMore, disabled } = useThreadListLoadMoreBehavior();

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={disabledProp || disabled}
      onClick={composeEventHandlers(onClick, loadMore)}
    />
  );
});

ThreadListPrimitiveLoadMore.displayName = "ThreadListPrimitive.LoadMore";
