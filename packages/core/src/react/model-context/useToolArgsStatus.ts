import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "assistant-stream/utils";
import { nullProtoRecord } from "../../utils/record";

type PropFieldStatus = "streaming" | "complete";

/**
 * Streaming completion status for the arguments of the current tool call.
 */
export type ToolArgsStatus<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Overall lifecycle state of the tool-call part. */
  status: "running" | "complete" | "incomplete" | "requires-action";
  /**
   * Whether the full arguments object is still streaming, including fields
   * that have not arrived yet. Complete means the object has finished parsing
   * or the tool-call part is no longer running; it does not imply tool success.
   * Without parser metadata, reads argsText before falling back to the lifecycle.
   */
  allPropsStatus: PropFieldStatus;
  /** Per-argument status keyed by argument name. */
  propStatus: Partial<Record<keyof TArgs, PropFieldStatus>>;
};

/**
 * Reads whether each argument field for the current tool-call message part is
 * still streaming or complete. `allPropsStatus` also accounts for fields that
 * have not arrived yet: an empty `propStatus` does not mean the object is done.
 * Arguments can be complete while `status` is still `"running"` during execution.
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
 *   const { propStatus } = useToolArgsStatus<{ city: string }>();
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

  if (part.type !== "tool-call") {
    throw new Error(
      "useToolArgsStatus can only be used inside tool-call message parts",
    );
  }

  const argsWithMeta = useMemo(
    () =>
      getPartialJsonObjectMeta(part.args)
        ? part.args
        : parsePartialJsonObject(part.argsText),
    [part.args, part.argsText],
  );

  return useMemo(() => {
    const statusType = part.status.type;
    const isStreaming = statusType === "running";
    const args = part.args as Record<string, unknown>;
    const meta = argsWithMeta && getPartialJsonObjectMeta(argsWithMeta);
    const propStatus = nullProtoRecord<PropFieldStatus>();

    for (const key of Object.keys(args)) {
      if (argsWithMeta && meta) {
        const fieldState = getPartialJsonObjectFieldState(argsWithMeta, [key]);
        propStatus[key] =
          fieldState === "complete" || !isStreaming ? "complete" : "streaming";
      } else {
        propStatus[key] = isStreaming ? "streaming" : "complete";
      }
    }

    return {
      status: statusType,
      allPropsStatus:
        meta?.state === "complete" || !isStreaming ? "complete" : "streaming",
      propStatus: propStatus as Partial<Record<keyof TArgs, PropFieldStatus>>,
    };
  }, [part, argsWithMeta]);
};
