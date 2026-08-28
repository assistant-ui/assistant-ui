import type {
  ReadonlyJSONArray,
  ReadonlyJSONObject,
} from "assistant-stream/utils";
import type { AssistantState } from "@assistant-ui/store";

/**
 * Disabled predicates shared by every binding's primitive layer. Each binding
 * consumes these as state selectors so the disabled semantics of a primitive
 * cannot drift between frameworks.
 */

export const composerSendDisabled = (s: AssistantState): boolean =>
  !s.composer.canSend || (s.thread.isRunning && !s.thread.capabilities.queue);

export const composerCancelDisabled = (s: AssistantState): boolean =>
  !s.composer.canCancel;

export const composerInputDisabled = (s: AssistantState): boolean =>
  s.thread.isDisabled || s.composer.dictation?.inputDisabled === true;

export const actionBarEditDisabled = (s: AssistantState): boolean =>
  s.composer.isEditing;

export const actionBarReloadDisabled = (s: AssistantState): boolean =>
  s.thread.isRunning || s.thread.isDisabled || s.message.role !== "assistant";

export const actionBarCopyDisabled = (s: AssistantState): boolean =>
  !(
    (s.message.role !== "assistant" || s.message.status?.type !== "running") &&
    s.message.parts.some((part) => part.type === "text" && part.text.length > 0)
  );

export const branchPickerPreviousDisabled = (s: AssistantState): boolean =>
  s.message.branchNumber <= 1 ||
  (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun);

export const branchPickerNextDisabled = (s: AssistantState): boolean =>
  s.message.branchNumber >= s.message.branchCount ||
  (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun);

export const suggestionTriggerDisabled = (
  s: AssistantState,
  send: boolean,
): boolean =>
  s.thread.isDisabled ||
  (send && s.thread.isRunning && !s.thread.capabilities.queue);

export const messageErrorText = (
  s: AssistantState,
):
  | string
  | number
  | boolean
  | ReadonlyJSONObject
  | ReadonlyJSONArray
  | undefined => {
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
};

export const threadListLoadMoreDisabled = (s: AssistantState): boolean =>
  !s.threads.hasMore || s.threads.isLoading || s.threads.isLoadingMore;
