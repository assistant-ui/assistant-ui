import type { ThreadMessage } from "../../utils/AssistantTypes";

export type MessageState = Readonly<{
  message: Readonly<ThreadMessage>;
  parentId: string | null;
  branches: readonly string[];
  isLast: boolean;
}>;
