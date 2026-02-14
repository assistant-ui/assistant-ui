import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import type { ToolCallStreamController } from "../../modules/tool-call";
import type { TextStreamController } from "../../modules/text";
import { AssistantTransformStream } from "../../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import {
  type UIMessageStreamChunk,
  type UIMessageStreamDataChunk,
} from "./chunk-types";
import { generateId } from "../../utils/generateId";

export type { UIMessageStreamChunk, UIMessageStreamDataChunk };

export type UIMessageStreamDecoderOptions = {
  onData?: (data: {
    type: string;
    name: string;
    data: unknown;
    transient?: boolean;
  }) => void;
};

type SSEEvent = {
  event: string;
  data: string;
  id?: string | undefined;
  retry?: number | undefined;
};

class SSEEventStream extends TransformStream<string, SSEEvent> {
  constructor() {
    let eventBuffer: Partial<SSEEvent> = {};
    let dataLines: string[] = [];

    super({
      start() {
        eventBuffer = {};
        dataLines = [];
      },
      transform(line, controller) {
        if (line.startsWith(":")) return;

        if (line === "") {
          if (dataLines.length > 0) {
            controller.enqueue({
              event: eventBuffer.event || "message",
              data: dataLines.join("\n"),
              id: eventBuffer.id,
              retry: eventBuffer.retry,
            });
          }
          eventBuffer = {};
          dataLines = [];
          return;
        }

        const [field, ...rest] = line.split(":");
        const value = rest.join(":").trimStart();

        switch (field) {
          case "event":
            eventBuffer.event = value;
            break;
          case "data":
            dataLines.push(value);
            break;
          case "id":
            eventBuffer.id = value;
            break;
          case "retry":
            eventBuffer.retry = Number(value);
            break;
        }
      },
      flush(controller) {
        if (dataLines.length > 0) {
          controller.enqueue({
            event: eventBuffer.event || "message",
            data: dataLines.join("\n"),
            id: eventBuffer.id,
            retry: eventBuffer.retry,
          });
        }
      },
    });
  }
}

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
      const toolCallControllers = new Map<string, ToolCallStreamController>();
      let activeToolCallArgsText: TextStreamController | undefined;
      let currentMessageId: string | undefined;
      let receivedDone = false;

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

            case "component": {
              const target = chunk.component.parentId
                ? controller.withParentId(chunk.component.parentId)
                : controller;
              target.appendComponent({
                name: chunk.component.name,
                ...(chunk.component.props !== undefined
                  ? { props: chunk.component.props }
                  : {}),
              });
              break;
            }

            case "tool-call-start": {
              activeToolCallArgsText?.close();
              activeToolCallArgsText = undefined;

              if (toolCallControllers.has(chunk.toolCallId)) {
                throw new Error(
                  `Encountered duplicate tool call id: ${chunk.toolCallId}`,
                );
              }

              const toolCallController = controller.addToolCallPart({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
              });
              toolCallControllers.set(chunk.toolCallId, toolCallController);
              activeToolCallArgsText = toolCallController.argsText;
              break;
            }

            case "tool-call-delta":
              activeToolCallArgsText?.append(chunk.argsText);
              break;

            case "tool-call-end":
              activeToolCallArgsText?.close();
              activeToolCallArgsText = undefined;
              break;

            case "tool-result": {
              const toolCallController = toolCallControllers.get(
                chunk.toolCallId,
              );
              if (!toolCallController) {
                throw new Error(
                  `Encountered tool result with unknown id: ${chunk.toolCallId}`,
                );
              }
              toolCallController.setResponse({
                result: chunk.result,
                isError: chunk.isError ?? false,
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
          activeToolCallArgsText?.close();
          toolCallControllers.forEach((ctrl) => ctrl.close());
          toolCallControllers.clear();
        },
      });

      return readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new LineDecoderStream())
        .pipeThrough(new SSEEventStream())
        .pipeThrough(
          new TransformStream<SSEEvent, UIMessageStreamChunk>({
            transform(event, controller) {
              if (event.event !== "message") {
                throw new Error(`Unknown SSE event type: ${event.event}`);
              }

              if (event.data === "[DONE]") {
                receivedDone = true;
                controller.terminate();
                return;
              }

              controller.enqueue(JSON.parse(event.data));
            },
            flush() {
              if (!receivedDone) {
                throw new Error(
                  "Stream ended abruptly without receiving [DONE] marker",
                );
              }
            },
          }),
        )
        .pipeThrough(transform);
    });
  }
}
