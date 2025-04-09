import sjson from "secure-json-parse";
import { AssistantStreamChunk } from "../AssistantStreamChunk";
import {
  AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../utils/stream/AssistantMetaTransformStream";
import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";
import { ReadonlyJSONValue } from "../utils/json/json-value";
import { ToolResponse } from "../ToolResponse";
import { withPromiseOrValue } from "../utils/withPromiseOrValue";

type ToolCallback = (toolCall: {
  toolCallId: string;
  toolName: string;
  args: unknown;
}) =>
  | Promise<ToolResponse<ReadonlyJSONValue>>
  | ToolResponse<ReadonlyJSONValue>
  | undefined;

export class ToolExecutionStream extends PipeableTransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(toolCallback: ToolCallback) {
    const toolCallPromises = new Map<string, PromiseLike<void>>();
    const toolCallArgsText: Record<string, string> = {};
    super((readable) => {
      const transform = new TransformStream<
        AssistantMetaStreamChunk,
        AssistantStreamChunk
      >({
        transform(chunk, controller) {
          // forward everything
          if (chunk.type !== "part-finish" || chunk.meta.type !== "tool-call") {
            controller.enqueue(chunk);
          }

          const type = chunk.type;

          switch (type) {
            case "text-delta": {
              if (chunk.meta.type === "tool-call") {
                const toolCallId = chunk.meta.toolCallId;
                if (toolCallArgsText[toolCallId] === undefined) {
                  toolCallArgsText[toolCallId] = chunk.textDelta;
                } else {
                  toolCallArgsText[toolCallId] += chunk.textDelta;
                }
              }
              break;
            }
            case "tool-call-args-text-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const { toolCallId, toolName } = chunk.meta;
              const argsText = toolCallArgsText[toolCallId];

              const promise = withPromiseOrValue(
                () => {
                  if (!argsText) {
                    console.log(
                      "Encountered tool call without argsText, this should never happen",
                    );
                    throw new Error(
                      "Encountered tool call without argsText, this is unexpected.",
                    );
                  }

                  let args;
                  try {
                    args = sjson.parse(argsText);
                  } catch (e) {
                    throw new Error(
                      `Function parameter parsing failed. ${JSON.stringify((e as Error).message)}`,
                    );
                  }

                  return toolCallback({
                    toolCallId,
                    toolName,
                    args,
                  });
                },
                (c) => {
                  if (c === undefined) return;

                  // TODO how to handle new ToolResult({ result: undefined })?
                  controller.enqueue({
                    type: "result",
                    path: chunk.path,
                    artifact: c.artifact,
                    result: c.result,
                    isError: c.isError,
                  });
                },
                (e) => {
                  controller.enqueue({
                    type: "result",
                    path: chunk.path,
                    result: String(e),
                    isError: true,
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
                  controller.enqueue(chunk);
                });
              } else {
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
