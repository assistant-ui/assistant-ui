"use client";

import type { FC, ReactNode } from "react";
import { useThreadEmpty } from "../../primitive-hooks";

type ThreadEmptyProps = {
  children: ReactNode;
};

export const ThreadEmpty: FC<ThreadEmptyProps> = ({ children }) => {
  const empty = useThreadEmpty();
  return empty ? children : null;
};
