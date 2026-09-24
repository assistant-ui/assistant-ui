import type {
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../types/message";
import { COMPLETE_STATUS, RUNNING_STATUS } from "./normalizePartStatus";

type PartWithStatus = {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

export const getGroupStatus = (
  parts: readonly (PartWithStatus | undefined)[],
): MessagePartStatus | ToolCallMessagePartStatus => {
  for (const part of parts) {
    if (part?.status.type === "running") return RUNNING_STATUS;
  }

  return parts.at(-1)?.status ?? COMPLETE_STATUS;
};

export const getGroupSummary = (
  parts: readonly (PartWithStatus | undefined)[],
  indices: readonly number[],
) => {
  const counts = {
    running: 0,
    complete: 0,
    incomplete: 0,
    requiresAction: 0,
  };
  let status: MessagePartStatus | ToolCallMessagePartStatus = COMPLETE_STATUS;
  let isRunning = false;

  for (const index of indices) {
    status = parts[index]?.status ?? COMPLETE_STATUS;
    switch (status.type) {
      case "running":
        counts.running++;
        isRunning = true;
        break;
      case "complete":
        counts.complete++;
        break;
      case "incomplete":
        counts.incomplete++;
        break;
      case "requires-action":
        counts.requiresAction++;
        break;
    }
  }

  return { status: isRunning ? RUNNING_STATUS : status, counts };
};
