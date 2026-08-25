import type { MessageStatus } from "../../types/message";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

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

type ToolCallStatusPart = {
  readonly type: string;
  readonly result?: unknown;
  readonly interrupt?: unknown;
  readonly approval?: {
    readonly approved?: boolean | undefined;
    readonly resolution?: string | undefined;
  };
};

export const isPendingToolCall = (part: ToolCallStatusPart): boolean =>
  part.type === "tool-call" && part.result === undefined;

export const isInterruptedToolCall = (part: ToolCallStatusPart): boolean => {
  if (part.type !== "tool-call" || part.result !== undefined) return false;
  return (
    part.interrupt != null ||
    (part.approval != null &&
      part.approval.approved === undefined &&
      part.approval.resolution === undefined)
  );
};

export const getAutoStatus = (
  isLast: boolean,
  isRunning: boolean,
  hasInterruptedToolCalls: boolean,
  hasPendingToolCalls: boolean,
  error?: ReadonlyJSONValue,
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
        : AUTO_STATUS_COMPLETE;
};
