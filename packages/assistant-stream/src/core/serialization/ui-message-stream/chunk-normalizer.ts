import { generateId } from "../../utils/generateId";
import type { ReadonlyJSONValue } from "../../../utils/json/json-value";
import type { UIMessageStreamChunk } from "./chunk-types";

export const createChunkNormalizer = (): {
  normalize(
    chunk: { type: string } & Record<string, any>,
    controller: TransformStreamDefaultController<UIMessageStreamChunk>,
  ): void;
  flush(
    controller: TransformStreamDefaultController<UIMessageStreamChunk>,
  ): void;
} => {
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

  return {
    normalize(chunk, controller) {
      if (chunk.type === "text-delta" && chunk.textDelta === undefined) {
        const { delta, ...rest } = chunk;
        controller.enqueue({
          ...rest,
          type: "text-delta",
          textDelta: delta ?? "",
        });
        return;
      }
      if (chunk.type === "start") {
        controller.enqueue({
          ...chunk,
          type: "start",
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
          type: "finish-step",
          finishReason: chunk.finishReason ?? "unknown",
          usage: chunk.usage ?? { inputTokens: 0, outputTokens: 0 },
          isContinued: chunk.isContinued ?? false,
        });
        return;
      }
      if (chunk.type === "finish") {
        controller.enqueue({
          ...chunk,
          type: "finish",
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
          toolName: typeof chunk.toolName === "string" ? chunk.toolName : "",
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
            toolName: typeof chunk.toolName === "string" ? chunk.toolName : "",
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
            result: typeof chunk.errorText === "string" ? chunk.errorText : "",
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
                  typeof chunk.errorText === "string" ? chunk.errorText : "",
                isError: true,
              }
            : {
                result: chunk.output as ReadonlyJSONValue,
                isError: false,
              };
        if (tool.emitted) emitPendingTool(controller, tool);
        return;
      }

      controller.enqueue(chunk as UIMessageStreamChunk);
    },
    flush(controller) {
      for (const tool of pendingTools.values()) {
        emitPendingTool(controller, tool);
      }
    },
  };
};
