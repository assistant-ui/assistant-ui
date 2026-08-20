import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiState((s) => s.thread.isEmpty)` instead.
 */
export const useThreadIsEmpty = (): boolean => {
  return useAuiState((s) => s.thread.isEmpty);
};
