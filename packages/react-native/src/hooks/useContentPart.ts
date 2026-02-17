import { useAuiState } from "@assistant-ui/store";

export function useContentPart(index: number) {
  return useAuiState((s) => s.message.parts[index]);
}
