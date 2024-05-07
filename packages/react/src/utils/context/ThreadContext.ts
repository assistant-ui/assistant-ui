import { createStoreContext } from "./createStoreContext";
import type { UseChatWithBranchesHelpers } from "../hooks/useBranches";

type ThreadStore = {
	chat: UseChatWithBranchesHelpers;
};

export const [ThreadContextProvider, useThreadContext] =
	createStoreContext<ThreadStore>("Thread.Provider");
