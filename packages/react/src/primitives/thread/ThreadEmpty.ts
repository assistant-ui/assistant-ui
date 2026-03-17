"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ThreadPrimitiveEmpty {
  export type Props = PropsWithChildren;
}

/**
 * @deprecated Use `<AuiIf condition={(s) => s.thread.isEmpty} />` instead.
 */
export const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmpty.Props> = ({
  children,
}) => {
  const empty = useAuiState((s) => s.thread.isEmpty);
  return empty ? children : null;
};

ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
