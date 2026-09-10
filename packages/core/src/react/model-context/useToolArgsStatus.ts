import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";

type PropFieldStatus = "streaming" | "complete";

/**
 * Streaming completion status for the arguments of the current tool call.
 */
export type ToolArgsStatus<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Overall lifecycle state of the tool-call part. */
  status: "running" | "complete" | "incomplete" | "requires-action";
  /** Status of the full arguments payload. */
  allPropsStatus: PropFieldStatus;
  /** Per-argument status keyed by argument name. */
  propStatus: Partial<Record<keyof TArgs, PropFieldStatus>>;
};

/**
 * Reads whether the arguments for the current tool-call message part are
 * still streaming or complete, both as a whole and for each field.
 *
 * Use inside a tool-call renderer to avoid showing incomplete argument values
 * as final.
 *
 * @throws If called outside a tool-call message part.
 *
 * @example
 * ```tsx
 * function WeatherToolUI({
 *   args,
 * }: ToolCallMessagePartProps<{ city: string }>) {
 *   const { allPropsStatus, propStatus } =
 *     useToolArgsStatus<{ city: string }>();
 *
 *   return (
 *     <span>
 *       {propStatus.city === "streaming" ? "Reading city..." : args.city}
 *     </span>
 *   );
 * }
 * ```
 */
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
    const allPropsStatus: PropFieldStatus =
      meta?.state === "complete" || !isStreaming ? "complete" : "streaming";
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
      allPropsStatus,
      propStatus: propStatus as Partial<Record<keyof TArgs, PropFieldStatus>>,
    };
  }, [part]);
};
