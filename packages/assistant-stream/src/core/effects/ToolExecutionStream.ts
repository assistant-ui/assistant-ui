import sjson from "secure-json-parse";
import { AssistantStreamChunk } from "../AssistantStreamChunk";
import {
  AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../utils/stream/AssistantMetaTransformStream";
import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";
import { ReadonlyJSONValue } from "../utils/json/json-value";

type ToolCallback = (toolCall: {
  toolCallId: string;
  toolName: string;
  args: unknown;
}) => Promise<ReadonlyJSONValue> | ReadonlyJSONValue | undefined;

export class ToolExecutionStream extends PipeableTransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(toolCallback: ToolCallback) {
    const toolCallPromises = new Map<string, Promise<unknown>>();
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
              if (!argsText)
                throw new Error("Unexpected tool call without args");

              const executeTool = () => {
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
              };

              let promiseOrUndefined;
              try {
                promiseOrUndefined = executeTool();
              } catch (e) {
                controller.enqueue({
                  type: "result",
                  path: chunk.path,
                  result: String(e),
                  isError: true,
                });
                break;
              }

              if (promiseOrUndefined instanceof Promise) {
                const toolCallPromise = promiseOrUndefined
                  .then((c) => {
                    if (c === undefined) return;

                    controller.enqueue({
                      type: "result",
                      path: chunk.path,
                      result: c,
                      isError: false,
                    });
                  })
                  .catch((e) => {
                    controller.enqueue({
                      type: "result",
                      path: chunk.path,
                      result: String(e),
                      isError: true,
                    });
                  });

                toolCallPromises.set(toolCallId, toolCallPromise);
              } else if (promiseOrUndefined !== undefined) {
                controller.enqueue({
                  type: "result",
                  path: chunk.path,
                  result: promiseOrUndefined,
                  isError: false,
                });
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
