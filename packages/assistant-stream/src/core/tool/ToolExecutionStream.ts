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

export class ToolExecutionStream extends PipeableTransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(options: ToolExecutionOptions) {
    const toolCallPromises = new Map<string, PromiseLike<void>>();
    const toolCallControllers = new Map<
      string,
      ToolCallReaderImpl<ReadonlyJSONObject, ReadonlyJSONValue>
    >();
    const toolCallIdsWithBackendResult = new Set<string>();

    super((readable) => {
      const transform = new TransformStream<
        AssistantMetaStreamChunk,
        AssistantStreamChunk
      >({
        async transform(chunk, controller) {
          // forward everything
          if (chunk.type !== "part-finish" || chunk.meta.type !== "tool-call") {
            controller.enqueue(chunk);
          }

          const type = chunk.type;

          switch (type) {
            case "part-start":
              if (chunk.part.type === "tool-call") {
                const reader = new ToolCallReaderImpl<
                  ReadonlyJSONObject,
                  ReadonlyJSONValue
                >();
                toolCallControllers.set(chunk.part.toolCallId, reader);

                options.streamCall({
                  reader,
                  toolCallId: chunk.part.toolCallId,
                  toolName: chunk.part.toolName,
                });
              }
              break;
            case "text-delta": {
              if (chunk.meta.type === "tool-call") {
                const toolCallId = chunk.meta.toolCallId;

                const controller = toolCallControllers.get(toolCallId);
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

              const { toolCallId } = chunk.meta;
              const controller = toolCallControllers.get(toolCallId);
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
              toolCallIdsWithBackendResult.add(toolCallId);
              break;
            }
            case "tool-call-args-text-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const { toolCallId, toolName } = chunk.meta;
              const streamController = toolCallControllers.get(toolCallId)!;
              if (!streamController)
                throw new Error("No controller found for tool call");

              // Args fully streamed: close the reader so awaited absent fields
              // resolve. Awaited so the close settles before the writer is reused.
              await streamController.finishArgsText();

              // A backend result is authoritative. Closing the args stream still
              // emits this finish chunk, but must not parse stale/incomplete args,
              // execute the frontend tool, or enqueue a second result.
              if (toolCallIdsWithBackendResult.has(toolCallId)) break;

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

                  const executeResult = options.execute({
                    toolCallId,
                    toolName,
                    args,
                  });

                  // Only mark as executing if the tool has frontend execution
                  if (executeResult !== undefined) {
                    isExecuting = true;
                    options.onExecutionStart?.(toolCallId, toolName);
                  }

                  return executeResult;
                },
                (c) => {
                  if (isExecuting) {
                    options.onExecutionEnd?.(toolCallId, toolName);
                  }

                  if (c === undefined) return;

                  // TODO how to handle new ToolResult({ result: undefined })?
                  const result = new ToolResponse({
                    artifact: c.artifact,
                    result: c.result,
                    isError: c.isError,
                    messages: c.messages,
                    modelContent: c.modelContent,
                  });
                  streamController.setResponse(result);
                  controller.enqueue({
                    type: "result",
                    path: chunk.path,
                    ...result,
                  });
                },
                (e) => {
                  if (isExecuting) {
                    options.onExecutionEnd?.(toolCallId, toolName);
                  }

                  const result = new ToolResponse({
                    result: String(e),
                    isError: true,
                  });

                  streamController.setResponse(result);
                  controller.enqueue({
                    type: "result",
                    path: chunk.path,
                    ...result,
                  });
                },
              );
              if (promise) {
                toolCallPromises.set(toolCallId, promise);
              }
              break;
            }

            case "part-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const { toolCallId } = chunk.meta;
              const toolCallPromise = toolCallPromises.get(toolCallId);
              if (toolCallPromise) {
                toolCallPromise.then(() => {
                  toolCallPromises.delete(toolCallId);
                  toolCallControllers.delete(toolCallId);
                  toolCallIdsWithBackendResult.delete(toolCallId);

                  controller.enqueue(chunk);
                });
              } else {
                toolCallControllers.delete(toolCallId);
                toolCallIdsWithBackendResult.delete(toolCallId);
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
