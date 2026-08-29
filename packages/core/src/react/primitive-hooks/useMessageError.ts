import { useAuiState } from "@assistant-ui/store";

export const useMessageError = () => {
  const message = useAuiState("message");
  if (
    message.status?.type !== "incomplete" ||
    message.status.reason !== "error"
  ) {
    return undefined;
  }
  const error = message.status.error;
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
};
