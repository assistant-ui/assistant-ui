import { getPartialJsonObjectFieldState } from "assistant-stream/utils";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS = { type: "complete" };

export const useToolArgsFieldStatus = (fieldPath: (string | number)[]) => {
  return useAuiState("part", (s) => {
    if (s.type !== "tool-call")
      throw new Error(
        "useToolArgsFieldStatus can only be used inside tool-call message parts",
      );

    const state = getPartialJsonObjectFieldState(s.args, fieldPath);
    if (state === "complete" || s.status?.type === "requires-action")
      return COMPLETE_STATUS;
    return s.status;
  });
};
