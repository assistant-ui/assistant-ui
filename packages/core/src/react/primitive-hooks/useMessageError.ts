import { useAuiState } from "@assistant-ui/store";

export const useMessageError = () => {
  return useAuiState((s) => {
    if (
      s.message.status?.type !== "incomplete" ||
      s.message.status.reason !== "error"
    ) {
      return undefined;
    }
    const error = s.message.status.error;
    if (typeof error === "string") return error;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    return error ?? "An error occurred";
  });
};
