import { MessageStatus } from "../../types";

const AUTO_STATUS_RUNNING = Object.freeze({ type: "running" });
const AUTO_STATUS_COMPLETE = Object.freeze({
  type: "complete",
  reason: "unknown",
});

export const isAutoStatus = (status: MessageStatus) =>
  status === AUTO_STATUS_RUNNING || status === AUTO_STATUS_COMPLETE;

export const getAutoStatus = (isLast: boolean, isRunning: boolean) =>
  isLast && isRunning ? AUTO_STATUS_RUNNING : AUTO_STATUS_COMPLETE;
