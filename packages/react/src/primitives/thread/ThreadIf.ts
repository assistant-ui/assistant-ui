"use client";

import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  empty: boolean | undefined;
  running: boolean | undefined;
  disabled: boolean | undefined;
};

type UseThreadIfProps = RequireAtLeastOne<ThreadIfFilters>;

const useThreadIf = (props: UseThreadIfProps) => {
  return useAuiState("thread", (s) => {
    if (props.empty === true && !s.isEmpty) return false;
    if (props.empty === false && s.isEmpty) return false;

    if (props.running === true && !s.isRunning) return false;
    if (props.running === false && s.isRunning) return false;
    if (props.disabled === true && !s.isDisabled) return false;
    if (props.disabled === false && s.isDisabled) return false;

    return true;
  });
};

export namespace ThreadPrimitiveIf {
  export type Props = PropsWithChildren<UseThreadIfProps>;
}

/**
 * @deprecated Use `<AuiIf condition={(s) => s.thread...} />` instead.
 */
export const ThreadPrimitiveIf: FC<ThreadPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useThreadIf(query);
  return result ? children : null;
};

ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";
