import type { MessageStatus } from "../../types/message";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import type { ThreadMessageLike } from "./thread-message-like";

type ThreadMessageLikeContentItem = Exclude<
  ThreadMessageLike["content"],
  string
>[number];

export const isPendingToolCall = (c: ThreadMessageLikeContentItem): boolean =>
  c.type === "tool-call" && c.result === undefined;

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
): MessageStatus => {
  if (isLast && error) {
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
      : hasPendingToolCalls
        ? AUTO_STATUS_PENDING
        : isCancelled
          ? AUTO_STATUS_CANCELLED
          : AUTO_STATUS_COMPLETE;
};

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
  );
