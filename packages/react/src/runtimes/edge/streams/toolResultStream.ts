import { Tool } from "../../../types/ModelConfigTypes";
import { JSONValue, LanguageModelV1StreamPart } from "@ai-sdk/provider";
import { z } from "zod";
import sjson from "secure-json-parse";

export type ToolResultStreamPart =
  | LanguageModelV1StreamPart
  | {
      type: "data";
      data: JSONValue[];
    }
  | {
      type: "tool-result";
      toolCallType: "function";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError?: boolean;
    }
  | {
      type: "step-finish";
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "other"
        | "unknown";
      usage: {
        promptTokens: number;
        completionTokens: number;
      };
      isContinued: boolean;
    };

export function toolResultStream(
  tools: Record<string, Tool> | undefined,
  abortSignal: AbortSignal,
) {
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

          let args;
          try {
            args = sjson.parse(argsText);
          } catch (e) {
            controller.enqueue({
              type: "tool-result",
              toolCallType,
              toolCallId,
              toolName,
              result:
                "Function parameter parsing failed. " +
                JSON.stringify((e as Error).message),
              isError: true,
            });
          }

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
            }
          }

          toolCallExecutions.set(
            toolCallId,
            (async () => {
              if (!tool.execute) return;

              try {
                const result = await tool.execute(args, { abortSignal });

                controller.enqueue({
                  type: "tool-result",
                  toolCallType,
                  toolCallId,
                  toolName,
                  result,
                });
              } catch (error) {
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
          break;
        }

        // ignore other parts
        case "text-delta":
        case "tool-call-delta":
        case "tool-result":
        case "step-finish":
        case "finish":
        case "error":
        case "response-metadata":
        case "data":
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
