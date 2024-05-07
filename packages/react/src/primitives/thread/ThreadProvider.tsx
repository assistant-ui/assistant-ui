"use client";

import { useChatWithBranches } from "../../utils/hooks/useBranches";
import type { UseChatHelpers } from "ai/react";
import type { FC } from "react";
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
