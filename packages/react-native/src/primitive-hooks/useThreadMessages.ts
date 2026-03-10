import { useAuiState } from "@assistant-ui/store";
import type { MessageState } from "@assistant-ui/core/store";

export const useThreadMessages = (): readonly MessageState[] => {
  return useAuiState((s) => s.thread.messages);
};
