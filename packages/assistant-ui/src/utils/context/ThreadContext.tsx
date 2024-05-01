import { createContext } from "react";
import { UseChatWithBranchesHelpers } from "../hooks/useBranches";

// probably abstract the thread API
export const ThreadContext = createContext<UseChatWithBranchesHelpers | null>(
  null,
);
