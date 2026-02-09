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
  return useAuiState((s) => {
    if (props.empty === true && !s.thread.isEmpty) return false;
    if (props.empty === false && s.thread.isEmpty) return false;

    if (props.running === true && !s.thread.isRunning) return false;
    if (props.running === false && s.thread.isRunning) return false;
    if (props.disabled === true && !s.thread.isDisabled) return false;
    if (props.disabled === false && s.thread.isDisabled) return false;

    return true;
  });
};

export namespace ThreadPrimitiveIf {
  export type Props = PropsWithChildren<UseThreadIfProps>;
}

/**
 * @deprecated Use `<AuiIf condition={({ thread }) => ...} />` instead.
 */
export const ThreadPrimitiveIf: FC<ThreadPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useThreadIf(query);
  return result ? children : null;
};

ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";
