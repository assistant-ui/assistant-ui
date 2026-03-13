import { useAuiState } from "@assistant-ui/store";

export const useMessageError = () => {
  return useAuiState((s) =>
    s.message.status?.type === "incomplete" &&
    s.message.status.reason === "error"
      ? (s.message.status.error ?? "An error occurred")
      : undefined,
  );
};
