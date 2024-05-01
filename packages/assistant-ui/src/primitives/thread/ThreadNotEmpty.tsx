"use client";

import { FC } from "react";
import { useThreadContext } from "../../utils/context/Context";

type ThreadNotEmptyProps = {
  children: React.ReactNode;
};

export const ThreadNotEmpty: FC<ThreadNotEmptyProps> = ({ children }) => {
  const thread = useThreadContext();
  if (thread.messages.length <= 0) return null;
  return children;
};
