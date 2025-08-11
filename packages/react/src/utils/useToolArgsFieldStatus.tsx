import { getPartialJsonObjectFieldState } from "assistant-stream/utils";
import { useAssistantState } from "../context";

const COMPLETE_STATUS = { type: "complete" };

export const useToolArgsFieldStatus = (fieldPath: (string | number)[]) => {
  return useAssistantState(({ part }) => {
    if (part.type !== "tool-call")
      throw new Error(
        "useToolArgsFieldStatus can only be used inside tool-call message parts",
      );

    const state = getPartialJsonObjectFieldState(part.args, fieldPath);
    if (state === "complete" || part.status?.type === "requires-action")
      return COMPLETE_STATUS;
    return part.status;
  });
};
