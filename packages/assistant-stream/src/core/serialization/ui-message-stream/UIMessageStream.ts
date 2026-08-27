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
import type { ReadonlyJSONValue } from "../../../utils/json/json-value";
import { createToolCallPartRegistry } from "../tool-call-part-registry";

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
      let activeToolCallId: string | undefined;
      let currentMessageId: string | undefined;
      type PendingTool = {
        toolCallId: string;
        toolName: string;
        deltas: string[];
        emitted: boolean;
        resultEmitted: boolean;
        pendingResult?: { result: ReadonlyJSONValue; isError: boolean };
      };
      const pendingTools = new Map<string, PendingTool>();
      const emitPendingTool = (
        out: TransformStreamDefaultController<UIMessageStreamChunk>,
        tool: PendingTool,
      ) => {
        if (!tool.emitted) {
          tool.emitted = true;
          out.enqueue({
            type: "tool-call-start",
            id: generateId(),
            toolCallId: tool.toolCallId,
            toolName: tool.toolName,
          });
          for (const argsText of tool.deltas) {
            out.enqueue({ type: "tool-call-delta", argsText });
          }
          out.enqueue({ type: "tool-call-end" });
        }
        if (tool.pendingResult && !tool.resultEmitted) {
          out.enqueue({
            type: "tool-result",
            toolCallId: tool.toolCallId,
            result: tool.pendingResult.result,
            ...(tool.pendingResult.isError ? { isError: true } : {}),
          });
          tool.resultEmitted = true;
        }
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
          if (chunk.type === "text-delta" && chunk.textDelta === undefined) {
            const { delta, ...rest } = chunk;
            controller.enqueue({ ...rest, textDelta: delta ?? "" });
            return;
          }
          if (chunk.type === "start") {
            controller.enqueue({
              ...chunk,
              messageId: chunk.messageId ?? generateId(),
            });
            return;
          }
          if (chunk.type === "source-url") {
            controller.enqueue({
              type: "source",
              source: {
                sourceType: "url",
                id: chunk.sourceId,
                url: chunk.url,
                ...(chunk.title && { title: chunk.title }),
              },
            });
            return;
          }
          if (chunk.type === "source" && chunk.source == null) return;
          if (chunk.type === "file" && chunk.file == null) {
            if (chunk.url === undefined) return;
            controller.enqueue({
              type: "file",
              file: { mimeType: chunk.mediaType, data: chunk.url },
            });
            return;
          }
          if (chunk.type === "finish-step") {
            controller.enqueue({
              ...chunk,
              finishReason: chunk.finishReason ?? "unknown",
              usage: chunk.usage ?? { inputTokens: 0, outputTokens: 0 },
              isContinued: chunk.isContinued ?? false,
            });
            return;
          }
          if (chunk.type === "finish") {
            controller.enqueue({
              ...chunk,
              finishReason: chunk.finishReason ?? "unknown",
              usage: chunk.usage ?? { inputTokens: 0, outputTokens: 0 },
            });
            return;
          }
          if (chunk.type === "tool-input-start") {
            if (typeof chunk.toolCallId !== "string") return;
            if (pendingTools.has(chunk.toolCallId)) return;
            pendingTools.set(chunk.toolCallId, {
              toolCallId: chunk.toolCallId,
              toolName:
                typeof chunk.toolName === "string" ? chunk.toolName : "",
              deltas: [],
              emitted: false,
              resultEmitted: false,
            });
            return;
          }
          if (chunk.type === "tool-input-delta") {
            if (typeof chunk.toolCallId !== "string") return;
            if (typeof chunk.inputTextDelta !== "string") return;
            const tool = pendingTools.get(chunk.toolCallId);
            if (!tool || tool.emitted) return;
            tool.deltas.push(chunk.inputTextDelta);
            return;
          }
          if (
            chunk.type === "tool-input-available" ||
            chunk.type === "tool-input-error"
          ) {
            if (typeof chunk.toolCallId !== "string") return;
            let tool = pendingTools.get(chunk.toolCallId);
            if (!tool) {
              tool = {
                toolCallId: chunk.toolCallId,
                toolName:
                  typeof chunk.toolName === "string" ? chunk.toolName : "",
                deltas: [],
                emitted: false,
                resultEmitted: false,
              };
              pendingTools.set(chunk.toolCallId, tool);
            }
            if (tool.emitted) return;
            if (chunk.input !== undefined) {
              tool.deltas = [
                typeof chunk.input === "string"
                  ? chunk.input
                  : JSON.stringify(chunk.input),
              ];
            }
            if (chunk.type === "tool-input-error") {
              tool.pendingResult = {
                result:
                  typeof chunk.errorText === "string" ? chunk.errorText : "",
                isError: true,
              };
            }
            emitPendingTool(controller, tool);
            return;
          }
          if (
            chunk.type === "tool-output-available" ||
            chunk.type === "tool-output-error"
          ) {
            if (typeof chunk.toolCallId !== "string") return;
            if (chunk.type === "tool-output-available" && chunk.preliminary) {
              return;
            }
            const tool = pendingTools.get(chunk.toolCallId);
            if (!tool || tool.resultEmitted) return;
            tool.pendingResult =
              chunk.type === "tool-output-error"
                ? {
                    result:
                      typeof chunk.errorText === "string"
                        ? chunk.errorText
                        : "",
                    isError: true,
                  }
                : {
                    result: chunk.output as ReadonlyJSONValue,
                    isError: false,
                  };
            if (tool.emitted) emitPendingTool(controller, tool);
            return;
          }

          controller.enqueue(chunk);
        },
        done: {
          marker: "[DONE]",
          onDone(controller) {
            for (const tool of pendingTools.values()) {
              emitPendingTool(controller, tool);
            }
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
