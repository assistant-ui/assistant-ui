"use client";

import { useThread } from "../../context";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  empty: boolean | undefined;
  running: boolean | undefined;
  disabled: boolean | undefined;
};

export type UseThreadIfProps = RequireAtLeastOne<ThreadIfFilters>;

export const useThreadIf = (props: UseThreadIfProps) => {
  return useThread((thread) => {
    if (props.empty === true && thread.messages.length !== 0) return false;
    if (props.empty === false && thread.messages.length === 0) return false;
    if (props.running === true && !thread.isRunning) return false;
    if (props.running === false && thread.isRunning) return false;
    if (props.disabled === true && thread.isDisabled) return false;
    if (props.disabled === false && thread.isDisabled) return false;

    return true;
  });
};
