"use client";

import type { FC, ReactNode } from "react";
import { useThreadEmpty } from "../../primitive-hooks";

export type ThreadPrimitiveEmptyProps = {
  children: ReactNode;
};

export const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmptyProps> = ({
  children,
}) => {
  const empty = useThreadEmpty();
  return empty ? children : null;
};

ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
