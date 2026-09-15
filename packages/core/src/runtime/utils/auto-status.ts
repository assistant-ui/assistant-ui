import type { MessageStatus } from "../../types/message";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ThreadMessageLike } from "./thread-message-like";

type ThreadMessageLikeContentItem = Exclude<
  ThreadMessageLike["content"],
  string
>[number];

export const isPendingToolCall = (c: ThreadMessageLikeContentItem): boolean =>
  c.type === "tool-call" && c.result === undefined;

/** A pending tool call whose nested conversation is still streaming; the outer message stays running until the nested run settles. */
export const isBackgroundToolCall = (
  c: ThreadMessageLikeContentItem,
): boolean => {
  if (c.type !== "tool-call" || c.result !== undefined) return false;
  const last = c.messages?.at(-1);
  return last?.role === "assistant" && last.status.type === "running";
};

export const isInterruptedToolCall = (
  c: ThreadMessageLikeContentItem,
): boolean => {
  if (c.type !== "tool-call" || c.result !== undefined) return false;
  return (
    c.interrupt != null ||
    (c.approval != null &&
      c.approval.approved === undefined &&
      c.approval.resolution === undefined)
  );
};

const symbolAutoStatus = Symbol("autoStatus");

const AUTO_STATUS_RUNNING = Object.freeze(
  Object.assign({ type: "running" as const }, { [symbolAutoStatus]: true }),
);
const AUTO_STATUS_COMPLETE = Object.freeze(
  Object.assign(
    {
      type: "complete" as const,
      reason: "unknown" as const,
    },
    { [symbolAutoStatus]: true },
  ),
);
const AUTO_STATUS_CANCELLED = Object.freeze(
  Object.assign(
    {
      type: "incomplete" as const,
      reason: "cancelled" as const,
    },
    { [symbolAutoStatus]: true },
  ),
);

const AUTO_STATUS_PENDING = Object.freeze(
  Object.assign(
    {
      type: "requires-action" as const,
      reason: "tool-calls" as const,
    },
    { [symbolAutoStatus]: true },
  ),
);

const AUTO_STATUS_INTERRUPT = Object.freeze(
  Object.assign(
    {
      type: "requires-action" as const,
      reason: "interrupt" as const,
    },
    { [symbolAutoStatus]: true },
  ),
);

export const isAutoStatus = (status: MessageStatus) =>
  (status as any)[symbolAutoStatus] === true;

export const getAutoStatus = (
  isLast: boolean,
  isRunning: boolean,
  hasInterruptedToolCalls: boolean,
  hasPendingToolCalls: boolean,
  error?: ReadonlyJSONValue,
  isCancelled?: boolean,
  hasBackgroundToolCalls?: boolean,
): MessageStatus => {
  if (isLast && error !== undefined) {
    return Object.assign(
      {
        type: "incomplete" as const,
        reason: "error" as const,
        error: error,
      },
      { [symbolAutoStatus]: true },
    );
  }

  return isLast && isRunning
    ? AUTO_STATUS_RUNNING
    : hasInterruptedToolCalls
      ? AUTO_STATUS_INTERRUPT
      : hasBackgroundToolCalls && !isCancelled
        ? AUTO_STATUS_RUNNING
        : hasPendingToolCalls
          ? AUTO_STATUS_PENDING
          : isCancelled
            ? AUTO_STATUS_CANCELLED
            : AUTO_STATUS_COMPLETE;
};

/** Status for a message entering the repository: the nested conversation is not being fed here, so it never keeps the message running. */
export const getRepositoryContentAutoStatus = (
  content: ThreadMessageLike["content"],
): MessageStatus =>
  getAutoStatus(
    false,
    false,
    typeof content !== "string" && content.some(isInterruptedToolCall),
    typeof content !== "string" && content.some(isPendingToolCall),
  );

export const getContentAutoStatus = (
  content: ThreadMessageLike["content"],
  isLast: boolean,
  isRunning: boolean,
): MessageStatus =>
  getAutoStatus(
    isLast,
    isRunning,
    typeof content !== "string" && content.some(isInterruptedToolCall),
    typeof content !== "string" && content.some(isPendingToolCall),
    undefined,
    undefined,
    typeof content !== "string" && content.some(isBackgroundToolCall),
  );
