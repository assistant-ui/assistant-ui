import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Tool } from "assistant-stream";
import { JSONSchema7 } from "json-schema";

export function tool<
  TArgs extends Record<string, unknown>,
  TResult = any,
>(tool: {
  description?: string | undefined;
  parameters: StandardSchemaV1<TArgs> | JSONSchema7;
  execute?: (
    args: TArgs,
    context: {
      toolCallId: string;
      abortSignal: AbortSignal;
    },
  ) => TResult | Promise<TResult>;
}): Tool<TArgs, TResult> {
  return tool;
}
