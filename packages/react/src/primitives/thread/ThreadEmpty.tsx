"use client";

import type { FC, ReactNode } from "react";
import { ThreadIf } from "./ThreadIf";

type ThreadEmptyProps = {
  children: ReactNode;
};

export const ThreadEmpty: FC<ThreadEmptyProps> = ({ children }) => {
  return <ThreadIf empty>{children}</ThreadIf>;
};
