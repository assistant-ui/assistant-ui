import type { ReactNode } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadMessage } from "./AssistantTypes";
import type { MessageComposerState } from "./ComposerStore";

export type MessageState = {
  message: ThreadMessage;
  parentId: string | null;
  branches: string[];
  isLast: boolean;
  inProgressIndicator: ReactNode | null;
  setInProgressIndicator: (value: ReactNode | null) => void;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
};

export type MessageStore = {
  useMessage: UseBoundStore<StoreApi<MessageState>>;
  useComposer: UseBoundStore<StoreApi<MessageComposerState>>;
};
