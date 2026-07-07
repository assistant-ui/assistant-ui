import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { MessageState } from "../../store/scopes/message";
import type { MessageStatus } from "../../types/message";
import { getMessageError } from "./useMessageError";

/**
 * High-level runtime phase derived from the current thread state.
 */
export type RuntimeStatusType =
  | "idle"
  | "loading"
  | "running"
  | "requires-action"
  | "error"
  | "cancelled"
  | "incomplete";

/**
 * Terminal message status reason surfaced by {@link RuntimeStatus}.
 */
export type RuntimeStatusReason = Extract<
  MessageStatus,
  { type: "requires-action" | "incomplete" }
>["reason"];

/**
 * Derived runtime status for badges, toasts, retry controls, and loading UI.
 */
export type RuntimeStatus = {
  readonly type: RuntimeStatusType;
  readonly isIdle: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly isRequiresAction: boolean;
  readonly isError: boolean;
  readonly isCancelled: boolean;
  readonly isIncomplete: boolean;
  readonly isDisabled: boolean;
  readonly reason: RuntimeStatusReason | undefined;
  readonly error: ReadonlyJSONValue | undefined;
};

/**
 * State fields used by {@link getRuntimeStatus}.
 */
export type RuntimeStatusInput = {
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly isDisabled?: boolean | undefined;
  readonly messageStatus?: MessageStatus | undefined;
};

/**
 * Derives a high-level status from runtime booleans and the latest terminal
 * message state.
 */
export const getRuntimeStatus = ({
  isLoading,
  isRunning,
  isDisabled = false,
  messageStatus,
}: RuntimeStatusInput): RuntimeStatus => {
  const reason =
    messageStatus?.type === "requires-action" ||
    messageStatus?.type === "incomplete"
      ? messageStatus.reason
      : undefined;
  const error = getMessageError(messageStatus);

  const type: RuntimeStatusType = isLoading
    ? "loading"
    : isRunning
      ? "running"
      : messageStatus?.type === "requires-action"
        ? "requires-action"
        : error !== undefined
          ? "error"
          : messageStatus?.type === "incomplete" &&
              messageStatus.reason === "cancelled"
            ? "cancelled"
            : messageStatus?.type === "incomplete"
              ? "incomplete"
              : "idle";

  const activeError = type === "error" ? error : undefined;
  const activeReason =
    type === "requires-action" ||
    type === "error" ||
    type === "cancelled" ||
    type === "incomplete"
      ? reason
      : undefined;

  return {
    type,
    isIdle: type === "idle",
    isLoading: type === "loading",
    isRunning: type === "running",
    isRequiresAction: type === "requires-action",
    isError: type === "error",
    isCancelled: type === "cancelled",
    isIncomplete: type === "incomplete",
    isDisabled,
    reason: activeReason,
    error: activeError,
  };
};

const getLastAssistantMessage = (
  messages: readonly MessageState[],
): MessageState | undefined =>
  messages.findLast((message) => message.role === "assistant");

/**
 * Reads the current runtime status from the active assistant thread.
 *
 * Use this for app-level status badges, loading indicators, error toasts, and
 * retry UI without manually combining `thread.isLoading`, `thread.isRunning`,
 * `thread.isDisabled`, terminal message errors, and terminal message status.
 *
 * @example
 * ```tsx
 * import { useRuntimeStatus } from "@assistant-ui/react";
 *
 * function RuntimeBadge() {
 *   const status = useRuntimeStatus();
 *   return <span data-status={status.type}>{status.type}</span>;
 * }
 * ```
 */
export const useRuntimeStatus = (): RuntimeStatus => {
  const isLoading = useAuiState((s) => s.thread.isLoading);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const isDisabled = useAuiState((s) => s.thread.isDisabled);
  const messageStatus = useAuiState(
    (s) => getLastAssistantMessage(s.thread.messages)?.status,
  );

  return useMemo(
    () =>
      getRuntimeStatus({
        isLoading,
        isRunning,
        isDisabled,
        messageStatus,
      }),
    [isDisabled, isLoading, isRunning, messageStatus],
  );
};
