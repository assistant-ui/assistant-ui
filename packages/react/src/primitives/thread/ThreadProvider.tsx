"use client";

import { useChatWithBranches } from "../../utils/hooks/useBranches";
import { UseChatHelpers } from "ai/react";
import { FC } from "react";
import { ThreadContextProvider } from "../../utils/context/ThreadContext";

type ThreadProviderProps = {
  chat: UseChatHelpers;
  children: React.ReactNode;
};

export const ThreadProvider: FC<ThreadProviderProps> = ({ chat, children }) => {
  const branches = useChatWithBranches(chat);
  return (
    <ThreadContextProvider chat={branches}>{children}</ThreadContextProvider>
  );
};
