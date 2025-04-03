import { Schema, z } from "zod";
import { Tool } from "./ModelContextTypes";
import { tool as vercelTool, ToolExecutionOptions } from "ai";
import type { ToolCallContentPartComponent } from "../types/ContentPartComponentTypes";

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

// import { makeAssistantToolUI } from "./makeAssistantToolUI";

export type AssistantToolUIProps<TArgs, TResult> = {
  toolName: string;
  render: ToolCallContentPartComponent<TArgs, TResult>;
};

export type Parameters = z.ZodTypeAny;
type InferParameters<P extends Parameters> = z.infer<P>;

export type ServerTool<P extends Parameters = any, Res = any> = {
  toolName: string;
  parameters: P;
  description?: string;
  server: (
    args: InferParameters<P>,
    options?: ToolExecutionOptions,
  ) => PromiseLike<Res>;
};

export type ClientTool<P extends Parameters = any, Res = any> = {
  toolName: string;
  parameters: P;
  description?: string;
  execute?: (args: InferParameters<P>) => PromiseLike<Res> | Res;
};

type AUIServerTool = <T extends Parameters, Res>(
  a: ServerTool<T, Res>,
) => ServerTool<T, Res>;

export type AUIClientTool = <T extends Parameters, Res>(
  a: ClientTool<T, Res>,
) => ClientTool<T, Res>;

export const auiServerTool: AUIServerTool = (a) => ({
  ...a,
});

export const aiSDKAdapter = (a: ServerTool<any, any>) => {
  return vercelTool({
    ...(a.description && { description: a.description }),
    parameters: a.parameters,
    execute: a.server,
  });
};

// export const auiToolBox = <
//   T extends Record<string, ReturnType<typeof auiTool<any, any>>>,
// >(
//   a: T,
// ) => ({
//   ...a,
// });
