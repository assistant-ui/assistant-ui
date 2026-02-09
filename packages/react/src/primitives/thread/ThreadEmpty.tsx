"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ThreadPrimitiveEmpty {
  export type Props = PropsWithChildren;
}

export const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmpty.Props> = ({
  children,
}) => {
  const empty = useAuiState(
    (s) => s.thread.messages.length === 0 && !s.thread.isLoading,
  );
  return empty ? children : null;
};

ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
