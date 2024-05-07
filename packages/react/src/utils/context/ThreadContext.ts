import { createStoreContext } from "./createStoreContext";
import { UseChatWithBranchesHelpers } from "../hooks/useBranches";

type ThreadStore = {
  chat: UseChatWithBranchesHelpers;
};

export const [ThreadContextProvider, useThreadContext] =
  createStoreContext<ThreadStore>("Thread.Provider");
