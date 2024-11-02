"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseThreadIfProps,
  useThreadIf,
} from "../../primitive-hooks/thread/useThreadIf";

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
