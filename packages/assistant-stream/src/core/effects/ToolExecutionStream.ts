import sjson from "secure-json-parse";
import { AssistantStreamChunk } from "../AssistantStreamChunk";
import {
  AssistantMetaStreamChunk,
  AssistantMetaTransformStream,
} from "../utils/stream/AssistantMetaTransformStream";
import { PipeableTransformStream } from "../utils/stream/PipeableTransformStream";

type ToolCallback = (toolCall: {
  toolCallId: string;
  toolName: string;
  args: unknown;
}) => Promise<unknown>;

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
                toolCallArgsText[toolCallId] += chunk.textDelta;
              }
              break;
            }
            case "tool-call-args-text-finish": {
              if (chunk.meta.type !== "tool-call") break;

              const { toolCallId, toolName } = chunk.meta;
              const argsText = toolCallArgsText[toolCallId];
              if (!argsText)
                throw new Error("Unexpected tool call without args");

              const executeTool = async () => {
                let args;
                try {
                  args = sjson.parse(argsText);
                } catch (e) {
                  throw (
                    "Function parameter parsing failed. " +
                    JSON.stringify((e as Error).message)
                  );
                }

                return toolCallback({
                  toolCallId,
                  toolName,
                  args,
                });
              };

              const toolCallPromise = executeTool()
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
          await Promise.all(toolCallPromises);
        },
      });

      return readable
        .pipeThrough(new AssistantMetaTransformStream())
        .pipeThrough(transform);
    });
  }
}
