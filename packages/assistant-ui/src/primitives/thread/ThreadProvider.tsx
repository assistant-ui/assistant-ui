"use client";

import { useChatWithBranches } from "../../utils/hooks/useBranches";
import { ThreadContext } from "../../utils/context/ThreadContext";
import { UseChatHelpers } from "ai/react";
import { FC } from "react";

type ThreadProviderProps = {
  chat: UseChatHelpers;
  children: React.ReactNode;
};

export const ThreadProvider: FC<ThreadProviderProps> = ({ chat, children }) => {
  const branches = useChatWithBranches(chat);
  return (
    <ThreadContext.Provider value={branches}>{children}</ThreadContext.Provider>
  );
};
