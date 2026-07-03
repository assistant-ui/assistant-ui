import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import type { ToolCallStreamController } from "../../modules/tool-call";
import type { TextStreamController } from "../../modules/text";
import { AssistantTransformStream } from "../../utils/stream/AssistantTransformStream";
import { PipeableTransformStream } from "../../utils/stream/PipeableTransformStream";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import type {
  UIMessageStreamChunk,
  UIMessageStreamDataChunk,
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
      const toolCallHasArgsText = new Map<string, boolean>();
      let activeToolCallId: string | undefined;
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

            case "tool-call-start":
            case "tool-input-start": {
              activeToolCallArgsText?.close();
              activeToolCallArgsText = undefined;
              activeToolCallId = undefined;

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
              toolCallHasArgsText.set(chunk.toolCallId, false);
              activeToolCallArgsText = toolCallController.argsText;
              activeToolCallId = chunk.toolCallId;
              break;
            }

            case "tool-call-delta":
              if (activeToolCallId) {
                toolCallHasArgsText.set(activeToolCallId, true);
              }
              activeToolCallArgsText?.append(chunk.argsText);
              break;

            case "tool-input-delta": {
              const targetToolCallId = chunk.toolCallId ?? activeToolCallId;
              if (targetToolCallId) {
                toolCallHasArgsText.set(targetToolCallId, true);
              }
              activeToolCallArgsText?.append(chunk.inputTextDelta);
              break;
            }

            case "tool-input-available": {
              const toolCallController = toolCallControllers.get(
                chunk.toolCallId,
              );
              if (!toolCallController) {
                throw new Error(
                  `Encountered tool input with unknown id: ${chunk.toolCallId}`,
                );
              }
              if (!toolCallHasArgsText.get(chunk.toolCallId)) {
                toolCallController.argsText.append(JSON.stringify(chunk.input));
              }
              toolCallController.argsText.close();
              toolCallHasArgsText.delete(chunk.toolCallId);
              if (activeToolCallId === chunk.toolCallId) {
                activeToolCallArgsText = undefined;
                activeToolCallId = undefined;
              }
              break;
            }

            case "tool-call-end":
              activeToolCallArgsText?.close();
              if (activeToolCallId) {
                toolCallHasArgsText.delete(activeToolCallId);
              }
              activeToolCallArgsText = undefined;
              activeToolCallId = undefined;
              break;

            case "tool-result":
            case "tool-output-available": {
              const toolCallController = toolCallControllers.get(
                chunk.toolCallId,
              );
              if (!toolCallController) {
                throw new Error(
                  `Encountered tool result with unknown id: ${chunk.toolCallId}`,
                );
              }
              toolCallController.setResponse({
                result:
                  chunk.type === "tool-result" ? chunk.result : chunk.output,
                isError:
                  chunk.type === "tool-result"
                    ? (chunk.isError ?? false)
                    : false,
                ...(chunk.type === "tool-result" && chunk.messages !== undefined
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
