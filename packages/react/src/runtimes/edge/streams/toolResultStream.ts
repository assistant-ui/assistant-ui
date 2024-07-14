import { Tool } from "../../../types/ModelConfigTypes";
import { LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { z } from "zod";
import sjson from "secure-json-parse";

export type ToolResultStreamPart =
  | LanguageModelV1StreamPart
  | {
      type: "tool-result";
      toolCallType: "function";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError?: boolean;
    };

export function toolResultStream(tools: Record<string, Tool> | undefined) {
  const toolCallExecutions = new Map<string, Promise<any>>();

  return new TransformStream<ToolResultStreamPart, ToolResultStreamPart>({
    transform(chunk, controller) {
      // forward everything
      controller.enqueue(chunk);

      // handle tool calls
      const chunkType = chunk.type;
      switch (chunkType) {
        case "tool-call": {
          const { toolCallId, toolCallType, toolName, args: argsText } = chunk;
          const tool = tools?.[toolName];
          if (!tool || !tool.execute) return;

          const args = sjson.parse(argsText);
          if (tool.parameters instanceof z.ZodType) {
            const result = tool.parameters.safeParse(args);
            if (!result.success) {
              controller.enqueue({
                type: "tool-result",
                toolCallType,
                toolCallId,
                toolName,
                result:
                  "Function parameter validation failed. " +
                  JSON.stringify(result.error.issues),
                isError: true,
              });
              return;
            } else {
              toolCallExecutions.set(
                toolCallId,
                (async () => {
                  try {
                    const result = await tool.execute!(args);

                    controller.enqueue({
                      type: "tool-result",
                      toolCallType,
                      toolCallId,
                      toolName,
                      result,
                    });
                  } catch (error) {
                    console.error("Error: ", error);
                    controller.enqueue({
                      type: "tool-result",
                      toolCallType,
                      toolCallId,
                      toolName,
                      result: "Error: " + error,
                      isError: true,
                    });
                  } finally {
                    toolCallExecutions.delete(toolCallId);
                  }
                })(),
              );
            }
          }
          break;
        }

        // ignore other parts
        case "text-delta":
        case "tool-call-delta":
        case "tool-result":
        case "finish":
        case "error":
          break;

        default: {
          const unhandledType: never = chunkType;
          throw new Error(`Unhandled chunk type: ${unhandledType}`);
        }
      }
    },

    async flush() {
      await Promise.all(toolCallExecutions.values());
    },
  });
}
