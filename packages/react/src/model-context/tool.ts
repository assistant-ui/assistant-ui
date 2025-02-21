import { Schema, z } from "zod";
import { Tool } from "./ModelContextTypes";

export type inferParameters<PARAMETERS extends Tool<any, any>["parameters"]> =
  PARAMETERS extends Schema<any>
    ? PARAMETERS["_type"]
    : PARAMETERS extends z.ZodTypeAny
      ? z.infer<PARAMETERS>
      : never;

export function tool<
  TArgs extends Tool<any, any>["parameters"],
  TResult = any,
>(tool: {
  description?: string | undefined;
  parameters: TArgs;
  execute?: (
    args: inferParameters<TArgs>,
    context: {
      toolCallId: string;
      abortSignal: AbortSignal;
    },
  ) => TResult | Promise<TResult>;
}): Tool<inferParameters<TArgs>, TResult> {
  return tool;
}
