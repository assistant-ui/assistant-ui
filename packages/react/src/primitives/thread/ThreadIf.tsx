"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseThreadIfProps,
  useThreadIf,
} from "../../primitive-hooks/thread/useThreadIf";

/**
 * @deprecated Use `ThreadPrimitive.If.Props` instead. This will be removed in 0.6.
 */
export type ThreadPrimitiveIfProps = ThreadPrimitiveIf.Props;

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
