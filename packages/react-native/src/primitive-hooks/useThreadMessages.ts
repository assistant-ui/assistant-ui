import type { ThreadMessage } from "@assistant-ui/core";
import { useThread } from "../hooks/useThread";

export const useThreadMessages = (): readonly ThreadMessage[] => {
  return useThread((s) => s.messages);
};
