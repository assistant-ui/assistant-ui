"use client";

import type { FC, PropsWithChildren } from "react";
import { useThreadEmpty } from "../../primitive-hooks/thread/useThreadEmpty";

export namespace ThreadPrimitiveEmpty {
  export type Props = PropsWithChildren;
}

export const ThreadPrimitiveEmpty: FC<ThreadPrimitiveEmpty.Props> = ({
  children,
}) => {
  const empty = useThreadEmpty();
  return empty ? children : null;
};

ThreadPrimitiveEmpty.displayName = "ThreadPrimitive.Empty";
