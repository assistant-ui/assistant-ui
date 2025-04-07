import { Tool } from "../../../model-context/ModelContextTypes";
import { z } from "zod";
import { AssistantMessage, ToolExecutionStream } from "assistant-stream";
import { ToolResponse } from "assistant-stream";

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

  let executeFn = tool.execute;

  if (tool.parameters instanceof z.ZodType) {
    const result = tool.parameters.safeParse(toolCall.args);
    if (!result.success) {
      executeFn =
        tool.experimental_onSchemaValidationError ??
        (() => {
          throw new Error(
            `Function parameter validation failed. ${JSON.stringify(result.error.issues)}`,
          );
        });
    }
  }

  const getResult = async () => {
    const result = await executeFn(toolCall.args, {
      toolCallId: toolCall.toolCallId,
      abortSignal,
    });
    if (result instanceof ToolResponse) return result;
    return new ToolResponse({
      result: result === undefined ? "<no result>" : result,
    });
  };

  return getResult();
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
  return new ToolExecutionStream((toolCall) =>
    getToolResponse(tools, abortSignal, toolCall),
  );
}
