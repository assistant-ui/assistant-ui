"use client";

import type { FC } from "react";
import { ThreadIf } from "./ThreadIf";

type ThreadEmptyProps = {
  children: React.ReactNode;
};

export const ThreadEmpty: FC<ThreadEmptyProps> = ({ children }) => {
  return <ThreadIf empty>{children}</ThreadIf>;
};
