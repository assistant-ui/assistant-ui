import { Tool, ToolCallReader, ToolExecuteFunction } from "./tool-types";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { ToolResponse } from "./ToolResponse";
import { ToolExecutionStream } from "./ToolExecutionStream";
import { AssistantMessage } from "../utils/types";

const isStandardSchemaV1 = (
  schema: unknown,
): schema is StandardSchemaV1<unknown> => {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema &&
    (schema as StandardSchemaV1<unknown>)["~standard"].version === 1
  );
};

function getToolResponse(
  tools: Record<string, Tool<any, any>> | undefined,
  abortSignal: AbortSignal,
  toolCall: {
    toolCallId: string;
    toolName: string;
    args: unknown;
  },
) {
  const tool = tools?.[toolCall.toolName];
  if (!tool || !tool.execute) return undefined;

  const getResult = async (toolExecute: ToolExecuteFunction<any, any>) => {
    let executeFn = toolExecute;

    if (isStandardSchemaV1(tool.parameters)) {
      let result = tool.parameters["~standard"].validate(toolCall.args);
      if (result instanceof Promise) result = await result;

      if (result.issues) {
        executeFn =
          tool.experimental_onSchemaValidationError ??
          (() => {
            throw new Error(
              `Function parameter validation failed. ${JSON.stringify(result.issues)}`,
            );
          });
      }
    }

    const result = await executeFn(toolCall.args, {
      toolCallId: toolCall.toolCallId,
      abortSignal,
    });
    if (result instanceof ToolResponse) return result;
    return new ToolResponse({
      result: result === undefined ? "<no result>" : result,
    });
  };

  return getResult(tool.execute);
}

function getToolStreamResponse<TArgs, TResult>(
  tools: Record<string, Tool<any, any>> | undefined,
  abortSignal: AbortSignal,
  reader: ToolCallReader<TArgs, TResult>,
  context: {
    toolCallId: string;
    toolName: string;
  },
) {
  tools?.[context.toolName]?.streamCall?.(reader, {
    toolCallId: context.toolCallId,
    abortSignal,
  });
}

export async function unstable_runPendingTools(
  message: AssistantMessage,
  tools: Record<string, Tool<any, any>> | undefined,
  abortSignal: AbortSignal,
) {
  // TODO parallel tool calling
  for (const part of message.parts) {
    if (part.type === "tool-call") {
      const promiseOrUndefined = getToolResponse(tools, abortSignal, part);
      if (promiseOrUndefined) {
        const result = await promiseOrUndefined;
        const updatedParts = message.parts.map((p) => {
          if (p.type === "tool-call" && p.toolCallId === part.toolCallId) {
            return {
              ...p,
              state: "result" as const,
              artifact: result.artifact,
              result: result.result,
              isError: result.isError,
            };
          }
          return p;
        });
        message = {
          ...message,
          parts: updatedParts,
          content: updatedParts,
        };
      }
    }
  }
  return message;
}

export function toolResultStream(
  tools: Record<string, Tool<any, any>> | undefined,
  abortSignal: AbortSignal,
) {
  return new ToolExecutionStream({
    execute: (toolCall) => getToolResponse(tools, abortSignal, toolCall),
    streamCall: ({ reader, ...context }) =>
      getToolStreamResponse(tools, abortSignal, reader, context),
  });
}
