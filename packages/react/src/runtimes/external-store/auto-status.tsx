const AUTO_STATUS_RUNNING = Object.freeze({ type: "running" });
const AUTO_STATUS_COMPLETE = Object.freeze({
  type: "complete",
  reason: "unknown",
});

export const getAutoStatus = (isLast: boolean, isRunning: boolean) =>
  isLast && isRunning ? AUTO_STATUS_RUNNING : AUTO_STATUS_COMPLETE;
