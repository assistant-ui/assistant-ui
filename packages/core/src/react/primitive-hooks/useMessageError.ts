import { useAuiState } from "@assistant-ui/store";

export const useMessageError = () => {
  return useAuiState("message", (s) => {
    if (s.status?.type !== "incomplete" || s.status.reason !== "error") {
      return undefined;
    }
    const error = s.status.error;
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
