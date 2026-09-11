import sjson from "secure-json-parse";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { AssistantTransformStream } from "../../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { createSSEJsonDecoder } from "../../utils/stream/SSEJson";
import type {
  UIMessageStreamChunk,
  UIMessageStreamDataChunk,
} from "./chunk-types";
import { generateId } from "../../utils/generateId";
import { createToolCallPartRegistry } from "../tool-call-part-registry";
import { createChunkNormalizer } from "./chunk-normalizer";

export type { UIMessageStreamChunk, UIMessageStreamDataChunk };

export type UIMessageStreamDecoderOptions = {
  onData?: (data: {
    type: string;
    name: string;
    data: unknown;
    transient?: boolean;
  }) => void;
};

const isDataChunk = (
  chunk: UIMessageStreamChunk,
): chunk is UIMessageStreamDataChunk => chunk.type.startsWith("data-");

/**
 * Decodes AI SDK v6 UI Message Stream format into AssistantStreamChunks.
 */
export class UIMessageStreamDecoder extends PipeableTransformStream<
  Uint8Array<ArrayBuffer>,
  AssistantStreamChunk
> {
  constructor(options: UIMessageStreamDecoderOptions = {}) {
    super((readable) => {
      const toolCallPartRegistry = createToolCallPartRegistry();
      const normalizer = createChunkNormalizer();
      let activeToolCallId: string | undefined;
      let currentMessageId: string | undefined;

      const transform = new AssistantTransformStream<UIMessageStreamChunk>({
        transform(chunk, controller) {
          const type = chunk.type;

          if (isDataChunk(chunk)) {
            const name = chunk.type.slice(5);

            if (options.onData) {
              options.onData({
                type: chunk.type,
                name,
                data: chunk.data,
                ...(chunk.transient !== undefined && {
                  transient: chunk.transient,
                }),
              });
            }

            if (!chunk.transient) {
              controller.enqueue({
                type: "data",
                path: [],
                data: [{ name, data: chunk.data }],
              });
            }
            return;
          }

          switch (type) {
            case "start":
              currentMessageId = chunk.messageId;
              controller.enqueue({
                type: "step-start",
                path: [],
                messageId: chunk.messageId,
              });
              break;

            case "text-start":
            case "text-end":
            case "reasoning-start":
            case "reasoning-end":
              break;

            case "text-delta":
              controller.appendText(chunk.textDelta);
              break;

            case "reasoning-delta":
              controller.appendReasoning(chunk.delta);
              break;

            case "source":
              controller.appendSource({
                type: "source",
                sourceType: chunk.source.sourceType,
                id: chunk.source.id,
                url: chunk.source.url,
                ...(chunk.source.title && { title: chunk.source.title }),
              });
              break;

            case "file":
              controller.appendFile({
                type: "file",
                mimeType: chunk.file.mimeType,
                data: chunk.file.data,
              });
              break;

            case "tool-call-start": {
              if (activeToolCallId !== undefined) {
                toolCallPartRegistry.closeArgsText(
                  toolCallPartRegistry.get(activeToolCallId),
                );
                activeToolCallId = undefined;
              }

              toolCallPartRegistry.start(chunk.toolCallId, () =>
                controller.addToolCallPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                }),
              );
              activeToolCallId = chunk.toolCallId;
              break;
            }

            case "tool-call-delta":
              if (activeToolCallId !== undefined) {
                toolCallPartRegistry.appendArgsText(
                  toolCallPartRegistry.get(activeToolCallId),
                  chunk.argsText,
                );
              }
              break;

            case "tool-call-end":
              if (activeToolCallId !== undefined) {
                toolCallPartRegistry.closeArgsText(
                  toolCallPartRegistry.get(activeToolCallId),
                );
                activeToolCallId = undefined;
              }
              break;

            case "tool-result": {
              if (chunk.toolCallId === activeToolCallId) {
                activeToolCallId = undefined;
              }
              const toolCallController = toolCallPartRegistry.tryGet(
                chunk.toolCallId,
              );
              if (!toolCallController) {
                throw new Error(
                  `Encountered tool result with unknown id: ${chunk.toolCallId}`,
                );
              }
              toolCallPartRegistry.setResponse(toolCallController, {
                result: chunk.result,
                isError: chunk.isError ?? false,
                ...(chunk.messages !== undefined
                  ? { messages: chunk.messages }
                  : {}),
              });
              break;
            }

            case "start-step":
              controller.enqueue({
                type: "step-start",
                path: [],
                messageId: chunk.messageId ?? currentMessageId ?? generateId(),
              });
              break;

            case "finish-step":
              controller.enqueue({
                type: "step-finish",
                path: [],
                finishReason: chunk.finishReason,
                usage: chunk.usage,
                isContinued: chunk.isContinued,
              });
              break;

            case "finish":
              controller.enqueue({
                type: "message-finish",
                path: [],
                finishReason: chunk.finishReason,
                usage: chunk.usage,
              });
              break;

            case "error":
              controller.enqueue({
                type: "error",
                path: [],
                error: chunk.errorText,
              });
              break;

            default:
              // ignore unknown types for forward compatibility
              break;
          }
        },
        flush() {
          if (activeToolCallId !== undefined) {
            toolCallPartRegistry.closeArgsText(
              toolCallPartRegistry.get(activeToolCallId),
            );
          }
          toolCallPartRegistry.closeAll();
        },
      });

      return createSSEJsonDecoder<UIMessageStreamChunk>({
        strict: true,
        parse(data, controller) {
          let chunk;
          try {
            chunk = sjson.parse(data);
          } catch {
            chunk = undefined;
          }
          if (
            typeof chunk !== "object" ||
            chunk === null ||
            Array.isArray(chunk) ||
            typeof chunk.type !== "string"
          ) {
            console.warn(
              `Dropped invalid UIMessageStream chunk: ${data.slice(0, 200)}`,
            );
            return;
          }
          normalizer.normalize(chunk, controller);
        },
        done: {
          marker: "[DONE]",
          onDone(controller) {
            normalizer.flush(controller);
          },
          onMissing() {
            throw new Error(
              "Stream ended abruptly without receiving [DONE] marker",
            );
          },
        },
      })(readable).pipeThrough(transform);
    });
  }
}
