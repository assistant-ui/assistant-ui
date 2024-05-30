import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadMessage } from "./AssistantTypes";
import type { MessageComposerState } from "./ComposerStore";

export type MessageState = {
  message: ThreadMessage;
  isLast: boolean;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
};

export type MessageStore = {
  useMessage: UseBoundStore<StoreApi<MessageState>>;
  useComposer: UseBoundStore<StoreApi<MessageComposerState>>;
};
