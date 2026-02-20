import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import type { AssistantStreamController } from "../../modules/assistant-stream";
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
      const toolCallArgsText = new Map<string, TextStreamController>();
      const toolCallHasArgsDelta = new Map<string, boolean>();
      let activeToolCallId: string | undefined;
      let currentMessageId: string | undefined;
      let receivedDone = false;

      const getToolCallController = (
        controller: AssistantStreamController,
        toolCallId: string,
        toolName = "unknown",
      ) => {
        const existing = toolCallControllers.get(toolCallId);
        if (existing) return existing;

        const toolCallController = controller.addToolCallPart({
          toolCallId,
          toolName,
        });
        toolCallControllers.set(toolCallId, toolCallController);
        toolCallArgsText.set(toolCallId, toolCallController.argsText);
        toolCallHasArgsDelta.set(toolCallId, false);
        return toolCallController;
      };

      const startToolCallController = (
        controller: AssistantStreamController,
        toolCallId: string,
        toolName: string,
      ) => {
        if (toolCallControllers.has(toolCallId)) {
          throw new Error(`Encountered duplicate tool call id: ${toolCallId}`);
        }
        return getToolCallController(controller, toolCallId, toolName);
      };

      const closeToolCallArgs = (toolCallId: string) => {
        const args = toolCallArgsText.get(toolCallId);
        args?.close();
        toolCallArgsText.delete(toolCallId);
        if (activeToolCallId === toolCallId) activeToolCallId = undefined;
      };

      const appendToolCallArgs = (toolCallId: string, delta: string) => {
        const args = toolCallArgsText.get(toolCallId);
        if (!args) return;
        toolCallHasArgsDelta.set(toolCallId, true);
        args.append(delta);
      };

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
                messageId: chunk.messageId ?? generateId(),
              });
              break;

            case "text-start":
            case "text-end":
            case "reasoning-start":
            case "reasoning-end":
              break;

            case "text-delta":
              controller.appendText(
                "textDelta" in chunk ? chunk.textDelta : chunk.delta,
              );
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

            case "source-url":
              controller.appendSource({
                type: "source",
                sourceType: "url",
                id: chunk.sourceId,
                url: chunk.url,
                ...(chunk.title && { title: chunk.title }),
              });
              break;

            case "source-document":
              controller.appendSource({
                type: "source",
                sourceType: "url",
                id: chunk.sourceId,
                // Represent document sources in the URL-only source model.
                url: `urn:source-document:${chunk.sourceId}`,
                ...(chunk.title && {
                  title: chunk.filename
                    ? `${chunk.title} (${chunk.filename})`
                    : chunk.title,
                }),
              });
              break;

            case "file":
              controller.appendFile({
                type: "file",
                mimeType:
                  "file" in chunk ? chunk.file.mimeType : chunk.mediaType,
                data: "file" in chunk ? chunk.file.data : chunk.url,
              });
              break;

            case "component": {
              const target = chunk.component.parentId
                ? controller.withParentId(chunk.component.parentId)
                : controller;
              target.appendComponent({
                name: chunk.component.name,
                ...(chunk.component.instanceId !== undefined
                  ? { instanceId: chunk.component.instanceId }
                  : {}),
                ...(chunk.component.props !== undefined
                  ? { props: chunk.component.props }
                  : {}),
              });
              break;
            }

            case "tool-call-start": {
              if (activeToolCallId) closeToolCallArgs(activeToolCallId);
              startToolCallController(
                controller,
                chunk.toolCallId,
                chunk.toolName,
              );
              activeToolCallId = chunk.toolCallId;
              break;
            }

            case "tool-call-delta":
              if (!activeToolCallId) break;
              appendToolCallArgs(activeToolCallId, chunk.argsText);
              break;

            case "tool-call-end":
              if (!activeToolCallId) break;
              closeToolCallArgs(activeToolCallId);
              break;

            case "tool-input-start":
              startToolCallController(
                controller,
                chunk.toolCallId,
                chunk.toolName,
              );
              activeToolCallId = chunk.toolCallId;
              break;

            case "tool-input-delta":
              getToolCallController(controller, chunk.toolCallId);
              appendToolCallArgs(chunk.toolCallId, chunk.inputTextDelta);
              break;

            case "tool-input-available": {
              getToolCallController(
                controller,
                chunk.toolCallId,
                chunk.toolName,
              );
              const hasDelta =
                toolCallHasArgsDelta.get(chunk.toolCallId) === true;
              if (!hasDelta) {
                const serialized = JSON.stringify(chunk.input);
                appendToolCallArgs(chunk.toolCallId, serialized ?? "null");
              }
              closeToolCallArgs(chunk.toolCallId);
              break;
            }

            case "tool-input-error": {
              const toolCallController = getToolCallController(
                controller,
                chunk.toolCallId,
                chunk.toolName,
              );
              toolCallController.setResponse({
                result: {
                  error: chunk.errorText,
                  input: chunk.input,
                },
                isError: true,
              });
              break;
            }

            case "tool-output-available": {
              const toolCallController = getToolCallController(
                controller,
                chunk.toolCallId,
              );
              toolCallController.setResponse({
                result: chunk.output,
                isError: false,
              });
              break;
            }

            case "tool-output-error": {
              const toolCallController = getToolCallController(
                controller,
                chunk.toolCallId,
              );
              toolCallController.setResponse({
                result: chunk.errorText,
                isError: true,
              });
              break;
            }

            case "tool-output-denied": {
              const toolCallController = getToolCallController(
                controller,
                chunk.toolCallId,
              );
              toolCallController.setResponse({
                result: "Tool output denied",
                isError: true,
              });
              break;
            }

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
                finishReason: chunk.finishReason ?? "unknown",
                usage: chunk.usage ?? { inputTokens: 0, outputTokens: 0 },
                isContinued: chunk.isContinued ?? false,
              });
              break;

            case "finish":
              controller.enqueue({
                type: "message-finish",
                path: [],
                finishReason: chunk.finishReason ?? "unknown",
                usage: chunk.usage ?? { inputTokens: 0, outputTokens: 0 },
              });
              break;

            case "error":
              controller.enqueue({
                type: "error",
                path: [],
                error: chunk.errorText,
              });
              break;

            case "abort":
            case "message-metadata":
              break;

            default:
              // ignore unknown types for forward compatibility
              break;
          }
        },
        flush() {
          toolCallArgsText.forEach((args) => args.close());
          toolCallArgsText.clear();
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
