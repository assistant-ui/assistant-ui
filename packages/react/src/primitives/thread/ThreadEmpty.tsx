"use client";

import type { FC, PropsWithChildren } from "react";
import { useThreadEmpty } from "../../primitive-hooks";

/**
 * @deprecated Use `ThreadPrimitive.Empty.Props` instead. This will be removed in 0.6.
 */
export type ThreadPrimitiveEmptyProps = ThreadPrimitiveEmpty.Props;

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
