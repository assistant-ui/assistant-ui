import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { MessageState } from "../../store/scopes/message";

/**
 * High-level runtime phase derived from the current thread state.
 */
export type RuntimeStatusType =
  | "idle"
  | "loading"
  | "running"
  | "error"
  | "cancelled";

/**
 * Derived runtime status for badges, toasts, retry controls, and loading UI.
 */
export type RuntimeStatus = {
  readonly type: RuntimeStatusType;
  readonly isIdle: boolean;
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly isError: boolean;
  readonly isCancelled: boolean;
  readonly isDisabled: boolean;
  readonly error: ReadonlyJSONValue | undefined;
};

/**
 * State fields used by {@link getRuntimeStatus}.
 */
export type RuntimeStatusInput = {
  readonly isLoading: boolean;
  readonly isRunning: boolean;
  readonly isDisabled?: boolean | undefined;
  readonly error?: ReadonlyJSONValue | undefined;
  readonly isCancelled?: boolean | undefined;
};

/**
 * Derives a high-level status from runtime booleans and the latest terminal
 * message state.
 */
export const getRuntimeStatus = ({
  isLoading,
  isRunning,
  isDisabled = false,
  error,
  isCancelled = false,
}: RuntimeStatusInput): RuntimeStatus => {
  const type: RuntimeStatusType = isLoading
    ? "loading"
    : isRunning
      ? "running"
      : error !== undefined
        ? "error"
        : isCancelled
          ? "cancelled"
          : "idle";

  const activeError = type === "error" ? error : undefined;

  return {
    type,
    isIdle: type === "idle",
    isLoading: type === "loading",
    isRunning: type === "running",
    isError: type === "error",
    isCancelled: type === "cancelled",
    isDisabled,
    error: activeError,
  };
};

const getLastAssistantMessage = (
  messages: readonly MessageState[],
): MessageState | undefined =>
  messages.findLast((message) => message.role === "assistant");

const getRuntimeError = (
  messages: readonly MessageState[],
): ReadonlyJSONValue | undefined => {
  const status = getLastAssistantMessage(messages)?.status;
  if (status?.type !== "incomplete" || status.reason !== "error") {
    return undefined;
  }
  return status.error ?? "An error occurred";
};

const getRuntimeIsCancelled = (messages: readonly MessageState[]): boolean => {
  const status = getLastAssistantMessage(messages)?.status;
  return status?.type === "incomplete" && status.reason === "cancelled";
};

/**
 * Reads the current runtime status from the active assistant thread.
 *
 * Use this for app-level status badges, loading indicators, error toasts, and
 * retry UI without manually combining `thread.isLoading`, `thread.isRunning`,
 * `thread.isDisabled`, and terminal message errors.
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
  const error = useAuiState((s) => getRuntimeError(s.thread.messages));
  const isCancelled = useAuiState((s) =>
    getRuntimeIsCancelled(s.thread.messages),
  );

  return useMemo(
    () =>
      getRuntimeStatus({
        isLoading,
        isRunning,
        isDisabled,
        error,
        isCancelled,
      }),
    [error, isCancelled, isDisabled, isLoading, isRunning],
  );
};
