import { useAuiState } from "@assistant-ui/store";
import type { MessageState } from "../../store/scopes/message";

export const useThreadMessages = (): readonly MessageState[] => {
  return useAuiState((s) => s.thread.messages);
};
