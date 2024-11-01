"use client";

import type { FC } from "react";
import { useThreadListItem } from "../../context/react/ThreadListItemContext";

export namespace ThreadListItemPrimitiveTitle {
  export type Props = {
    fallback?: React.ReactNode;
  };
}

export const ThreadListItemPrimitiveTitle: FC<
  ThreadListItemPrimitiveTitle.Props
> = ({ fallback }) => {
  const title = useThreadListItem((t) => t.title);
  return <>{title || fallback}</>;
};

ThreadListItemPrimitiveTitle.displayName = "ThreadListItemPrimitive.Title";
