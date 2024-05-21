import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { BranchState } from "../../vercel/useVercelAIBranches";
import type { ThreadMessage } from "./AssistantTypes";
import type { ComposerStore } from "./ComposerTypes";

export type MessageState = {
  message: ThreadMessage;
  branchState: BranchState;
  isLast: boolean;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
};

export type MessageStore = ComposerStore & {
  useMessage: UseBoundStore<StoreApi<MessageState>>;
};

export const MessageContext = createContext<MessageStore | null>(null);

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useMessageContext must be used within a MessageProvider");
  return context;
};
