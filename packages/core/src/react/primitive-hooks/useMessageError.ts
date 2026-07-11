import { useAuiState } from "@assistant-ui/store";
import { isAssistantError } from "../../types/error";

export const useMessageError = () => {
  return useAuiState((s) => {
    if (
      s.message.status?.type !== "incomplete" ||
      s.message.status.reason !== "error"
    ) {
      return undefined;
    }
    const error = s.message.status.error;
    if (isAssistantError(error)) return error.message;
    if (typeof error === "string") return error;
    return error ?? "An error occurred";
  });
};
