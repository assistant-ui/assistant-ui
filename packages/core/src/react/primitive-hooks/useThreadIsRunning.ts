import { useAuiState } from "@assistant-ui/store";

export const useThreadIsRunning = (): boolean => {
  return useAuiState((s) => s.thread.isRunning);
};
