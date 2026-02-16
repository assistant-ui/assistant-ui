import type { Tool } from "assistant-stream";

export type AssistantToolProps<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  toolName: string;
  render?: unknown;
};

export type AssistantInstructionsConfig = {
  disabled?: boolean | undefined;
  instruction: string;
};
