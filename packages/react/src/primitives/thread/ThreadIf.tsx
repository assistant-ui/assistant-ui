"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseThreadIfProps,
  useThreadIf,
} from "../../primitive-hooks/thread/useThreadIf";

export type ThreadIfProps = PropsWithChildren<UseThreadIfProps>;

export const ThreadIf: FC<ThreadIfProps> = ({ children, ...query }) => {
  const result = useThreadIf(query);
  return result ? children : null;
};
