import type {
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "../types/message";

type PartWithStatus = {
  readonly status: MessagePartStatus | ToolCallMessagePartStatus;
};

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});
const RUNNING_STATUS: MessagePartStatus = Object.freeze({
  type: "running",
});

export const getGroupStatus = (
  parts: readonly (PartWithStatus | undefined)[],
  indices?: readonly number[],
): MessagePartStatus | ToolCallMessagePartStatus => {
  if (indices) {
    for (const index of indices) {
      if (parts[index]?.status.type === "running") return RUNNING_STATUS;
    }

    const lastIndex = indices.at(-1);
    return lastIndex === undefined
      ? COMPLETE_STATUS
      : (parts[lastIndex]?.status ?? COMPLETE_STATUS);
  }

  for (const part of parts) {
    if (part?.status.type === "running") return RUNNING_STATUS;
  }

  return parts.at(-1)?.status ?? COMPLETE_STATUS;
};
