import sjson from "secure-json-parse";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import {
  type AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../utils/stream/AssistantMetaTransformStream";
import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../utils/json/json-value";
import { ToolResponse } from "./ToolResponse";
import { withPromiseOrValue } from "../utils/withPromiseOrValue";
import { ToolCallReaderImpl } from "./ToolCallReader";
import type { ToolCallReader } from "./tool-types";

const TOOL_EXECUTION_ID = Symbol.for("assistant-stream.tool-execution-id");

type ToolCallback = (toolCall: {
  toolCallId: string;
  toolName: string;
  args: ReadonlyJSONObject;
}) =>
  | Promise<ToolResponse<ReadonlyJSONValue>>
  | ToolResponse<ReadonlyJSONValue>
  | undefined;

type ToolStreamCallback = <
  TArgs extends ReadonlyJSONObject = ReadonlyJSONObject,
  TResult extends ReadonlyJSONValue = ReadonlyJSONValue,
>(toolCall: {
  reader: ToolCallReader<TArgs, TResult>;
  toolCallId: string;
  toolName: string;
}) => void;

type ToolExecutionOptions = {
  execute: ToolCallback;
  streamCall: ToolStreamCallback;
  onExecutionStart?:
    | ((toolCallId: string, toolName: string) => void)
    | undefined;
  onExecutionEnd?: ((toolCallId: string, toolName: string) => void) | undefined;
};

type InternalToolExecutionOptions = {
  execute: (toolCall: {
    toolCallId: string;
    toolName: string;
    args: ReadonlyJSONObject;
    executionId: symbol;
  }) =>
    | Promise<ToolResponse<ReadonlyJSONValue>>
    | ToolResponse<ReadonlyJSONValue>
    | undefined;
  streamCall: <
    TArgs extends ReadonlyJSONObject = ReadonlyJSONObject,
    TResult extends ReadonlyJSONValue = ReadonlyJSONValue,
  >(toolCall: {
    reader: ToolCallReader<TArgs, TResult>;
    toolCallId: string;
    toolName: string;
    executionId: symbol;
  }) => void;
  onExecutionStart?:
    | ((toolCallId: string, toolName: string, executionId: symbol) => void)
    | undefined;
  onExecutionEnd?:
    | ((toolCallId: string, toolName: string, executionId: symbol) => void)
    | undefined;
};

const invokeExecutionCallback = (
  name: "onExecutionStart" | "onExecutionEnd",
  callback:
    | ((toolCallId: string, toolName: string, executionId: symbol) => void)
    | undefined,
  toolCallId: string,
  toolName: string,
  executionId: symbol,
) => {
  try {
    const result = callback?.(toolCallId, toolName, executionId) as unknown;
    void Promise.resolve(result).catch((error) => {
      console.error(
        `[assistant-stream] ${name} callback threw an error`,
        error,
      );
    });
  } catch (error) {
    console.error(`[assistant-stream] ${name} callback threw an error`, error);
  }
};

const pathKey = (path: readonly number[]) => path.join(",");

const withExecutionId = <T extends object>(
  chunk: T,
  executionId: symbol,
): T => {
  const result = { ...chunk };
  Object.defineProperty(result, TOOL_EXECUTION_ID, {
    value: executionId,
    enumerable: true,
  });
  return result;
};

const enqueueIfOpen = (
  controller: TransformStreamDefaultController<AssistantStreamChunk>,
  chunk: AssistantStreamChunk,
) => {
  try {
    controller.enqueue(chunk);
  } catch (error) {
    // enqueue() throwing TypeError is the portable termination signal for TransformStream controllers.
    if (!(error instanceof TypeError)) throw error;
  }
};

export class ToolExecutionStream extends PipeableTransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(options: ToolExecutionOptions) {
    const internalOptions = options as unknown as InternalToolExecutionOptions;
    const toolCallPromises = new Map<symbol, PromiseLike<void>>();
    const toolCallControllers = new Map<
      symbol,
      ToolCallReaderImpl<ReadonlyJSONObject, ReadonlyJSONValue>
    >();
    const toolCallIdsWithBackendResult = new Set<symbol>();
    const executionIdsByPath = new Map<string, symbol>();
    let nextPartIndex = 0;

    super((readable) => {
      const transform = new TransformStream<
        AssistantMetaStreamChunk,
        AssistantStreamChunk
      >({
        async transform(chunk, controller) {
          const executionId = executionIdsByPath.get(pathKey(chunk.path));

          // forward everything
          if (chunk.type !== "part-finish" || chunk.meta.type !== "tool-call") {
            controller.enqueue(
              executionId ? withExecutionId(chunk, executionId) : chunk,
            );
          }

          const type = chunk.type;

          switch (type) {
            case "part-start": {
              const partIndex = nextPartIndex;
              nextPartIndex += 1;
              if (chunk.part.type === "tool-call") {
                const reader = new ToolCallReaderImpl<
                  ReadonlyJSONObject,
                  ReadonlyJSONValue
                >();
                const executionId = Symbol();
                executionIdsByPath.set(String(partIndex), executionId);
                toolCallControllers.set(executionId, reader);

                internalOptions.streamCall({
                  reader,
                  toolCallId: chunk.part.toolCallId,
                  toolName: chunk.part.toolName,
                  executionId,
                });
              }
              break;
            }
            case "text-delta": {
              if (chunk.meta.type === "tool-call") {
                const executionId = executionIdsByPath.get(pathKey(chunk.path));

                const controller = executionId
                  ? toolCallControllers.get(executionId)
                  : undefined;
                if (!controller)
                  throw new Error("No controller found for tool call");
                // Awaited so the writer lock is released (and argsText updated)
                // before the next chunk acquires the writer.
                await controller.appendArgsTextDelta(chunk.textDelta);
              }
              break;
            }
            case "result": {
              if (chunk.meta.type !== "tool-call") break;

              const executionId = executionIdsByPath.get(pathKey(chunk.path));
              const controller = executionId
                ? toolCallControllers.get(executionId)
                : undefined;
              if (!controller)
                throw new Error("No controller found for tool call");
              controller.setResponse(
                new ToolResponse({
                  result: chunk.result,
                  artifact: chunk.artifact,
                  isError: chunk.isError,
                  modelContent: chunk.modelContent,
                }),
              );
              toolCallIdsWithBackendResult.add(executionId!);
              break;
            }
            case "tool-call-args-text-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const { toolCallId, toolName } = chunk.meta;
              const executionId = executionIdsByPath.get(pathKey(chunk.path));
              const streamController = executionId
                ? toolCallControllers.get(executionId)
                : undefined;
              if (!streamController)
                throw new Error("No controller found for tool call");

              // Args fully streamed: close the reader so awaited absent fields
              // resolve. Awaited so the close settles before the writer is reused.
              await streamController.finishArgsText();

              // A backend result is authoritative. Closing the args stream still
              // emits this finish chunk, but must not parse stale/incomplete args,
              // execute the frontend tool, or enqueue a second result.
              if (toolCallIdsWithBackendResult.has(executionId!)) break;

              let isExecuting = false;
              const promise = withPromiseOrValue(
                () => {
                  let args: ReadonlyJSONObject;
                  try {
                    args = sjson.parse(
                      streamController.argsText,
                    ) as ReadonlyJSONObject;
                  } catch (e) {
                    throw new Error(
                      `Function parameter parsing failed. ${JSON.stringify((e as Error).message)}`,
                    );
                  }

                  const executeResult = internalOptions.execute({
                    toolCallId,
                    toolName,
                    args,
                    executionId: executionId!,
                  });

                  // Only mark as executing if the tool has frontend execution
                  if (executeResult !== undefined) {
                    isExecuting = true;
                    invokeExecutionCallback(
                      "onExecutionStart",
                      internalOptions.onExecutionStart,
                      toolCallId,
                      toolName,
                      executionId!,
                    );
                  }

                  return executeResult;
                },
                (c) => {
                  if (isExecuting) {
                    invokeExecutionCallback(
                      "onExecutionEnd",
                      internalOptions.onExecutionEnd,
                      toolCallId,
                      toolName,
                      executionId!,
                    );
                  }

                  if (c === undefined) return;

                  const result = new ToolResponse({
                    artifact: c.artifact,
                    result: c.result,
                    isError: c.isError,
                    messages: c.messages,
                    modelContent: c.modelContent,
                  });
                  streamController.setResponse(result);
                  enqueueIfOpen(
                    controller,
                    withExecutionId(
                      {
                        type: "result",
                        path: chunk.path,
                        ...result,
                      },
                      executionId!,
                    ),
                  );
                },
                (e) => {
                  if (isExecuting) {
                    invokeExecutionCallback(
                      "onExecutionEnd",
                      internalOptions.onExecutionEnd,
                      toolCallId,
                      toolName,
                      executionId!,
                    );
                  }

                  const result = new ToolResponse({
                    result: String(e),
                    isError: true,
                  });

                  streamController.setResponse(result);
                  enqueueIfOpen(
                    controller,
                    withExecutionId(
                      {
                        type: "result",
                        path: chunk.path,
                        ...result,
                      },
                      executionId!,
                    ),
                  );
                },
              );
              if (promise) {
                toolCallPromises.set(executionId!, promise);
              }
              break;
            }

            case "part-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const executionId = executionIdsByPath.get(pathKey(chunk.path));
              const toolCallPromise = executionId
                ? toolCallPromises.get(executionId)
                : undefined;
              const cleanup = () => {
                if (!executionId) return;
                toolCallPromises.delete(executionId);
                toolCallControllers.delete(executionId);
                toolCallIdsWithBackendResult.delete(executionId);
                executionIdsByPath.delete(pathKey(chunk.path));
              };
              if (toolCallPromise) {
                toolCallPromise.then(() => {
                  cleanup();

                  enqueueIfOpen(controller, chunk);
                });
              } else {
                cleanup();
                controller.enqueue(chunk);
              }
            }
          }
        },
        async flush() {
          await Promise.all(toolCallPromises.values());
        },
      });

      return readable
        .pipeThrough(new AssistantMetaTransformStream())
        .pipeThrough(transform);
    });
  }
}
