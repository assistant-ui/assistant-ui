import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiState((s) => s.thread.isRunning)` instead.
 */
export const useThreadIsRunning = (): boolean => {
  return useAuiState("thread").isRunning;
};
