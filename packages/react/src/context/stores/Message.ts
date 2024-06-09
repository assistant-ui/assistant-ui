import type { ReactNode } from "react";
import type { ThreadMessage } from "../../utils/AssistantTypes";

export type MessageState = Readonly<{
  message: Readonly<ThreadMessage>;
  parentId: string | null;
  branches: readonly string[];
  isLast: boolean;
  inProgressIndicator: ReactNode | null;
  setInProgressIndicator: (value: ReactNode | null) => void;
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
}>;
