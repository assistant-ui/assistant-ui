"use client";

import { useThreadContext } from "../../context/react/ThreadContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  empty: boolean | undefined;
  running: boolean | undefined;
};

export type UseThreadIfProps = RequireAtLeastOne<ThreadIfFilters>;

export const useThreadIf = (props: UseThreadIfProps) => {
  const { useThread } = useThreadContext();
  return useThread((thread) => {
    if (props.empty === true && thread.messages.length !== 0) return false;
    if (props.empty === false && thread.messages.length === 0) return false;
    if (props.running === true && !thread.isRunning) return false;
    if (props.running === false && thread.isRunning) return false;

    return true;
  });
};
