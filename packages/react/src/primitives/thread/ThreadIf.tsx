"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  /** Render children if the thread is empty (no messages). */
  empty: boolean | undefined;
  /** Render children if the thread is running (assistant is responding). */
  running: boolean | undefined;
  /** Render children if the thread is disabled. */
  disabled: boolean | undefined;
};

type UseThreadIfProps = RequireAtLeastOne<ThreadIfFilters>;

const useThreadIf = (props: UseThreadIfProps) => {
  return useAssistantState(({ thread }) => {
    const isEmpty = thread.messages.length === 0 && !thread.isLoading;
    if (props.empty === true && !isEmpty) return false;
    if (props.empty === false && isEmpty) return false;

    if (props.running === true && !thread.isRunning) return false;
    if (props.running === false && thread.isRunning) return false;
    if (props.disabled === true && !thread.isDisabled) return false;
    if (props.disabled === false && thread.isDisabled) return false;

    return true;
  });
};

export namespace ThreadPrimitiveIf {
  export type Props = PropsWithChildren<UseThreadIfProps>;
}

export const ThreadPrimitiveIf: FC<ThreadPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useThreadIf(query);
  return result ? children : null;
};

ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";
