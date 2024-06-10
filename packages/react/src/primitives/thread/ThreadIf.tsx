"use client";

import type { FC, PropsWithChildren } from "react";
import { useThreadContext } from "../../context/ThreadContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  empty: boolean | undefined;
  running: boolean | undefined;
};

type ThreadIfProps = PropsWithChildren<RequireAtLeastOne<ThreadIfFilters>>;

const useThreadIf = (props: RequireAtLeastOne<ThreadIfFilters>) => {
  const { useThread } = useThreadContext();
  return useThread((thread) => {
    if (props.empty === true && thread.messages.length !== 0) return false;
    if (props.empty === false && thread.messages.length === 0) return false;
    if (props.running === true && !thread.isRunning) return false;
    if (props.running === false && thread.isRunning) return false;

    return true;
  });
};

export const ThreadIf: FC<ThreadIfProps> = ({ children, ...query }) => {
  const result = useThreadIf(query);
  return result ? children : null;
};
