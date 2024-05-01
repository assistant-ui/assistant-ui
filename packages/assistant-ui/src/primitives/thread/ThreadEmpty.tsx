"use client";

import { FC } from "react";
import { useThreadContext } from "../../utils/context/Context";

type ThreadEmptyProps = {
  children: React.ReactNode;
};

export const ThreadEmpty: FC<ThreadEmptyProps> = ({ children }) => {
  const thread = useThreadContext();
  if (thread.messages.length > 0) return null;
  return children;
};
