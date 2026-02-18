import { useAuiState } from "@assistant-ui/store";

export const useThreadIsEmpty = (): boolean => {
  return useAuiState((s) => s.thread.isEmpty);
};
