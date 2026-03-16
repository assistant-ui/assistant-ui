import { Tool, ToolCallReader, ToolExecuteFunction } from "./tool-types";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { ToolResponse } from "./ToolResponse";
import { ToolExecutionStream } from "./ToolExecutionStream";
import { AssistantMessage } from "../utils/types";
import { ReadonlyJSONObject, ReadonlyJSONValue } from "../../utils";

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
  tools: Record<string, Tool> | undefined,
  abortSignal: AbortSignal,
  toolCall: {
    toolCallId: string;
    toolName: string;
    args: ReadonlyJSONObject;
  },
  human: (toolCallId: string, payload: unknown) => Promise<unknown>,
) {
  const tool = tools?.[toolCall.toolName];
  if (!tool || !tool.execute) return undefined;

  const getResult = async (
    toolExecute: ToolExecuteFunction<ReadonlyJSONObject, unknown>,
  ): Promise<ToolResponse<ReadonlyJSONValue>> => {
    // Check if already aborted before starting
    if (abortSignal.aborted) {
      return new ToolResponse({
        result: "Tool execution was cancelled.",
        isError: true,
      });
    }

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

    // Create abort promise that resolves after 2 microtasks
    // This gives tools that handle abort a chance to win the race
    const abortPromise = new Promise<ToolResponse<ReadonlyJSONValue>>(
      (resolve) => {
        const onAbort = () => {
          queueMicrotask(() => {
            queueMicrotask(() => {
              resolve(
                new ToolResponse({
                  result: "Tool execution was cancelled.",
                  isError: true,
                }),
              );
            });
          });
        };
        if (abortSignal.aborted) {
          onAbort();
        } else {
          abortSignal.addEventListener("abort", onAbort, { once: true });
        }
      },
    );

    const executePromise = (async () => {
      const result = (await executeFn(toolCall.args, {
        toolCallId: toolCall.toolCallId,
        abortSignal,
        human: (payload: unknown) => human(toolCall.toolCallId, payload),
      })) as unknown as ReadonlyJSONValue;
      return ToolResponse.toResponse(result);
    })();

    return Promise.race([executePromise, abortPromise]);
  };

  return getResult(tool.execute);
}

function getToolStreamResponse(
  tools: Record<string, Tool> | undefined,
  abortSignal: AbortSignal,
  reader: ToolCallReader<any, ReadonlyJSONValue>,
  context: {
    toolCallId: string;
    toolName: string;
  },
  human: (toolCallId: string, payload: unknown) => Promise<unknown>,
) {
  tools?.[context.toolName]?.streamCall?.(reader, {
    toolCallId: context.toolCallId,
    abortSignal,
    human: (payload: unknown) => human(context.toolCallId, payload),
  });
}

export async function unstable_runPendingTools(
  message: AssistantMessage,
  tools: Record<string, Tool> | undefined,
  abortSignal: AbortSignal,
  human: (toolCallId: string, payload: unknown) => Promise<unknown>,
) {
  const toolCallPromises = message.parts
    .filter((part) => part.type === "tool-call")
    .map(async (part) => {
      const promiseOrUndefined = getToolResponse(
        tools,
        abortSignal,
        part,
        human ??
          (async () => {
            throw new Error(
              "Tool human input is not supported in this context",
            );
          }),
      );
      if (promiseOrUndefined) {
        try {
        const result = await promiseOrUndefined;
        return {
          toolCallId: part.toolCallId,
          result,
        }  
        } catch (error) {
          const result = new ToolResponse({
            isError: true,
            result: error instanceof Error ? error.message : String(error),
          })
           return {
          toolCallId: part.toolCallId,
          result,
        } 
        }
      }
      return null;
    });

  const toolCallResults = (await Promise.all(toolCallPromises)).filter(
    (result) => result !== null,
  ) as { toolCallId: string; result: ToolResponse<ReadonlyJSONValue> }[];

  if (toolCallResults.length === 0) {
    return message;
  }

  const toolCallResultsById = toolCallResults.reduce(
    (acc, { toolCallId, result }) => {
      acc[toolCallId] = result;
      return acc;
    },
    {} as Record<string, ToolResponse<ReadonlyJSONValue>>,
  );

  const updatedParts = message.parts.map((p) => {
    if (p.type === "tool-call") {
      const toolResponse = toolCallResultsById[p.toolCallId];
      if (toolResponse) {
        return {
          ...p,
          state: "result" as const,
          ...(toolResponse.artifact !== undefined
            ? { artifact: toolResponse.artifact }
            : {}),
          result: toolResponse.result as ReadonlyJSONValue,
          isError: toolResponse.isError,
        };
      }
    }
    return p;
  });

  return {
    ...message,
    parts: updatedParts,
    content: updatedParts,
  };
}

export type ToolResultStreamOptions = {
  onExecutionStart?: (toolCallId: string, toolName: string) => void;
  onExecutionEnd?: (toolCallId: string, toolName: string) => void;
};

export function toolResultStream(
  tools:
    | Record<string, Tool>
    | (() => Record<string, Tool> | undefined)
    | undefined,
  abortSignal: AbortSignal | (() => AbortSignal),
  human: (toolCallId: string, payload: unknown) => Promise<unknown>,
  options?: ToolResultStreamOptions,
) {
  const toolsFn = typeof tools === "function" ? tools : () => tools;
  const abortSignalFn =
    typeof abortSignal === "function" ? abortSignal : () => abortSignal;
  return new ToolExecutionStream({
    execute: (toolCall) =>
      getToolResponse(toolsFn(), abortSignalFn(), toolCall, human),
    streamCall: ({ reader, ...context }) =>
      getToolStreamResponse(toolsFn(), abortSignalFn(), reader, context, human),
    onExecutionStart: options?.onExecutionStart,
    onExecutionEnd: options?.onExecutionEnd,
  });
}
