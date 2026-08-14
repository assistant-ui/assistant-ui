import type { AssistantState } from "@assistant-ui/store";

/**
 * Disabled predicates shared by every binding's primitive layer. Each binding
 * consumes these as state selectors so the disabled semantics of a primitive
 * cannot drift between frameworks.
 */

/** The composer cannot send: empty, or a run is in flight with no queue. */
export const composerSendDisabled = (s: AssistantState): boolean =>
  !s.composer.canSend || (s.thread.isRunning && !s.thread.capabilities.queue);

/** Nothing is cancelable on the composer. */
export const composerCancelDisabled = (s: AssistantState): boolean =>
  !s.composer.canCancel;

/** The composer input rejects typing: thread disabled or dictation holds it. */
export const composerInputDisabled = (s: AssistantState): boolean =>
  s.thread.isDisabled || s.composer.dictation?.inputDisabled === true;

/** The message is already being edited. */
export const actionBarEditDisabled = (s: AssistantState): boolean =>
  s.composer.isEditing;

/** Reload is unavailable: running, disabled, or not an assistant message. */
export const actionBarReloadDisabled = (s: AssistantState): boolean =>
  s.thread.isRunning || s.thread.isDisabled || s.message.role !== "assistant";

/** Copy is unavailable: still streaming, or no non-empty text part. */
export const actionBarCopyDisabled = (s: AssistantState): boolean =>
  !(
    (s.message.role !== "assistant" || s.message.status?.type !== "running") &&
    s.message.parts.some((part) => part.type === "text" && part.text.length > 0)
  );

/** No earlier branch, or branch switching is unavailable during the run. */
export const branchPickerPreviousDisabled = (s: AssistantState): boolean =>
  s.message.branchNumber <= 1 ||
  (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun);

/** No later branch, or branch switching is unavailable during the run. */
export const branchPickerNextDisabled = (s: AssistantState): boolean =>
  s.message.branchNumber >= s.message.branchCount ||
  (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun);

/** The suggestion cannot fire; `send` triggers append instead of drafting. */
export const suggestionTriggerDisabled = (
  s: AssistantState,
  send: boolean,
): boolean =>
  s.thread.isDisabled ||
  (send && s.thread.isRunning && !s.thread.capabilities.queue);
