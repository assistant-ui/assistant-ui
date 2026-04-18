import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";

type PropFieldStatus = "streaming" | "complete";

export type ToolArgsStatus<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
> = {
  status: "running" | "complete" | "incomplete" | "requires-action";
  propStatus: Partial<Record<keyof TArgs, PropFieldStatus>>;
};

export const useToolArgsStatus = <
  TArgs extends Record<string, unknown> = Record<string, unknown>,
>(): ToolArgsStatus<TArgs> => {
  const part = useAuiState((s) => s.part);

  return useMemo(() => {
    const statusType = part.status.type;

    if (part.type !== "tool-call") {
      throw new Error(
        "useToolArgsStatus can only be used inside tool-call message parts",
      );
    }

    const isStreaming = statusType === "running";
    const args = part.args as Record<string, unknown>;
    const meta = getPartialJsonObjectMeta(args as Record<symbol, unknown>);
    const propStatus: Partial<Record<string, PropFieldStatus>> = {};

    for (const key of Object.keys(args)) {
      if (meta) {
        const fieldState = getPartialJsonObjectFieldState(args, [key]);
        propStatus[key] =
          fieldState === "complete" || !isStreaming ? "complete" : "streaming";
      } else {
        propStatus[key] = isStreaming ? "streaming" : "complete";
      }
    }

    return {
      status: statusType,
      propStatus: propStatus as Partial<Record<keyof TArgs, PropFieldStatus>>,
    };
  }, [part]);
};
