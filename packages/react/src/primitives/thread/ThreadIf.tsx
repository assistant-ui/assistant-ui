"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseThreadIfProps,
  useThreadIf,
} from "../../primitive-hooks/thread/useThreadIf";

export type ThreadPrimitiveIfProps = PropsWithChildren<UseThreadIfProps>;

export const ThreadPrimitiveIf: FC<ThreadPrimitiveIfProps> = ({
  children,
  ...query
}) => {
  const result = useThreadIf(query);
  return result ? children : null;
};

ThreadPrimitiveIf.displayName = "ThreadPrimitive.If";
