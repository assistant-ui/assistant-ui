import { useAuiState } from "@assistant-ui/store";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { MessageStatus } from "../../types/message";

export const getMessageError = (
  status: MessageStatus | undefined,
): ReadonlyJSONValue | undefined =>
  status?.type === "incomplete" && status.reason === "error"
    ? (status.error ?? "An error occurred")
    : undefined;

export const useMessageError = () => {
  return useAuiState((s) => getMessageError(s.message.status));
};
