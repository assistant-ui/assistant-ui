import type { ThreadMessage } from "../../types/AssistantTypes";

export type MessageState = Readonly<{
  message: Readonly<ThreadMessage>;
  parentId: string | null;
  branches: readonly string[];
  isLast: boolean;
}>;
