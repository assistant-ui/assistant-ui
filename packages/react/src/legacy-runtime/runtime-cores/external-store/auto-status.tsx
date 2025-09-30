import { MessageStatus } from "../../../types";

const AUTO_STATUS_RUNNING = Object.freeze({ type: "running" });
const AUTO_STATUS_COMPLETE = Object.freeze({
  type: "complete",
  reason: "unknown",
});

const AUTO_STATUS_PENDING = Object.freeze({
  type: "requires-action",
  reason: "tool-calls",
});

const AUTO_STATUS_SUSPENDED = Object.freeze({
  type: "requires-action",
  reason: "interrupt",
});

export const isAutoStatus = (status: MessageStatus) =>
  status === AUTO_STATUS_RUNNING || status === AUTO_STATUS_COMPLETE;

export const getAutoStatus = (
  isLast: boolean,
  isRunning: boolean,
  hasSuspendedToolCalls: boolean,
  hasPendingToolCalls: boolean,
) =>
  isLast && isRunning
    ? AUTO_STATUS_RUNNING
    : hasSuspendedToolCalls
      ? AUTO_STATUS_SUSPENDED
      : hasPendingToolCalls
        ? AUTO_STATUS_PENDING
        : AUTO_STATUS_COMPLETE;
