"use client";

import type { FC, ReactNode } from "react";
import { useAssistantState } from "../../context";

export namespace ThreadListItemPrimitiveTitle {
  export type Props = {
    fallback?: ReactNode;
  };
}

export const ThreadListItemPrimitiveTitle: FC<
  ThreadListItemPrimitiveTitle.Props
> = ({ fallback }) => {
  const title = useAssistantState(({ threadListItem }) => threadListItem.title);
  return <>{title || fallback}</>;
};

ThreadListItemPrimitiveTitle.displayName = "ThreadListItemPrimitive.Title";
