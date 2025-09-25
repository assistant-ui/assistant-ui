"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";

export namespace ThreadPrimitiveEmpty {
  export type Props = PropsWithChildren;
}

export const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmpty.Props> = ({
  children,
}) => {
  const empty = useAssistantState(
    ({ thread }) => thread.messages.length === 0 && !thread.isLoading,
  );
  return empty ? children : null;
};

ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
