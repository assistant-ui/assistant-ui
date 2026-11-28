import { generateId } from "../../utils/generateId";
import type { ReadonlyJSONValue } from "../../../utils/json/json-value";
import type { UIMessageStreamChunk } from "./chunk-types";

type ChunkController = {
  enqueue(chunk: UIMessageStreamChunk): void;
};

export const createChunkNormalizer = (): {
  normalize(
    chunk: { type: string } & Record<string, any>,
    controller: ChunkController,
  ): void;
  flush(controller: ChunkController): void;
} => {
  type PendingTool = {
    toolCallId: string;
    toolName: string;
    providerExecuted: boolean;
    deltas: string[];
    emitted: boolean;
    hasFinalResult: boolean;
    /** The step that opened the call, so a reset discards only its own calls. */
    ownerStep: number;
    pendingResults: {
      result: ReadonlyJSONValue;
      isError: boolean;
      isPreliminary?: boolean;
    }[];
  };
  const pendingTools = new Map<string, PendingTool>();
  // The step a call belongs to. A reset rolls back the step it names, so a call
  // an earlier step opened keeps its record and still receives its late output.
  let stepIndex = 0;
  // The decoder opens a step with `start` and treats a `start-step` that
  // repeats its message id as that same step, so the step count must advance
  // only where the decoder emits a step boundary.
  let stepOpenedByStart = false;
  let currentMessageId: string | undefined;
  // Calls an earlier reset already rolled back, so a late output cannot reopen
  // either of them.
  const discardedToolCallIds = new Set<string>();
  const createPendingTool = (
    toolCallId: string,
    toolName: unknown,
  ): PendingTool => ({
    toolCallId,
    toolName: typeof toolName === "string" ? toolName : "",
    providerExecuted: false,
    deltas: [],
    emitted: false,
    hasFinalResult: false,
    ownerStep: stepIndex,
    pendingResults: [],
  });
  const markProviderExecuted = (
    tool: PendingTool,
    chunk: Record<string, unknown>,
  ) => {
    if (chunk.providerExecuted === true) tool.providerExecuted = true;
  };
  const emitPendingTool = (out: ChunkController, tool: PendingTool) => {
    if (!tool.emitted) {
      tool.emitted = true;
      // The part is created now, so the call belongs to the step it lands in.
      tool.ownerStep = stepIndex;
      out.enqueue({
        type: "tool-call-start",
        id: generateId(),
        toolCallId: tool.toolCallId,
        toolName: tool.toolName,
        ...(tool.providerExecuted && { providerExecuted: true }),
      });
      for (const argsText of tool.deltas) {
        out.enqueue({ type: "tool-call-delta", argsText });
      }
      out.enqueue({ type: "tool-call-end" });
    }
    while (tool.pendingResults.length > 0) {
      const pendingResult = tool.pendingResults.shift()!;
      out.enqueue({
        type: "tool-result",
        toolCallId: tool.toolCallId,
        result: pendingResult.result,
        ...(pendingResult.isError ? { isError: true } : {}),
        ...(pendingResult.isPreliminary ? { isPreliminary: true } : {}),
      });
    }
  };

  return {
    normalize(chunk, controller) {
      if (chunk.type === "abort") {
        pendingTools.clear();
        controller.enqueue({
          type: "finish",
          finishReason: "other",
          usage: { inputTokens: 0, outputTokens: 0 },
        });
        return;
      }
      if (chunk.type === "reset-step") {
        for (const [toolCallId, tool] of [...pendingTools]) {
          if (tool.ownerStep !== stepIndex) {
            // An earlier step's call survives this reset, but its pending input
            // state does not: the AI SDK clears partial tool calls at every
            // reset, so that input must not surface as a call later.
            if (!tool.emitted) pendingTools.delete(toolCallId);
            continue;
          }
          discardedToolCallIds.add(toolCallId);
          pendingTools.delete(toolCallId);
        }
        controller.enqueue({ type: "reset-step" });
        return;
      }
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
        stepIndex++;
        stepOpenedByStart = true;
        currentMessageId = chunk.messageId;
        controller.enqueue({
          ...chunk,
          type: "start",
          messageId: chunk.messageId ?? generateId(),
        });
        return;
      }
      if (chunk.type === "start-step") {
        const messageId = chunk.messageId ?? currentMessageId;
        const isOpenStep =
          stepOpenedByStart &&
          messageId !== undefined &&
          messageId === currentMessageId;
        stepOpenedByStart = false;
        if (!isOpenStep) stepIndex++;
        controller.enqueue(chunk as UIMessageStreamChunk);
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
        stepOpenedByStart = false;
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
        discardedToolCallIds.delete(chunk.toolCallId);
        if (pendingTools.has(chunk.toolCallId)) return;
        const tool = createPendingTool(chunk.toolCallId, chunk.toolName);
        markProviderExecuted(tool, chunk);
        pendingTools.set(chunk.toolCallId, tool);
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
        // Input-completing frames create the call when the current step lacks
        // it, mirroring the AI SDK's create-on-miss input handling, so a frame
        // for a discarded id reopens that id as a fresh attempt.
        discardedToolCallIds.delete(chunk.toolCallId);
        let tool = pendingTools.get(chunk.toolCallId);
        if (!tool) {
          tool = createPendingTool(chunk.toolCallId, chunk.toolName);
          pendingTools.set(chunk.toolCallId, tool);
        }
        if (tool.emitted) return;
        markProviderExecuted(tool, chunk);
        if (chunk.input !== undefined) {
          const isUnparsedInputText =
            chunk.type === "tool-input-error" &&
            typeof chunk.input === "string";
          tool.deltas = [
            isUnparsedInputText ? chunk.input : JSON.stringify(chunk.input),
          ];
        }
        if (chunk.type === "tool-input-error") {
          tool.pendingResults.push({
            result: typeof chunk.errorText === "string" ? chunk.errorText : "",
            isError: true,
          });
          tool.hasFinalResult = true;
        }
        emitPendingTool(controller, tool);
        return;
      }
      if (
        chunk.type === "tool-output-available" ||
        chunk.type === "tool-output-error"
      ) {
        if (typeof chunk.toolCallId !== "string") return;
        if (
          chunk.type === "tool-output-available" &&
          !Object.hasOwn(chunk, "output")
        )
          return;
        if (discardedToolCallIds.has(chunk.toolCallId)) return;
        // An output never moves a call to another step: the call stays with the
        // step that opened it, so a reset of the current step leaves it alone.
        let tool = pendingTools.get(chunk.toolCallId);
        const opensCall = tool === undefined;
        if (!tool) {
          tool = createPendingTool(chunk.toolCallId, "");
          pendingTools.set(chunk.toolCallId, tool);
        }
        if (tool.hasFinalResult) return;
        if (!tool.emitted) markProviderExecuted(tool, chunk);
        const pendingResult =
          chunk.type === "tool-output-error"
            ? {
                result:
                  typeof chunk.errorText === "string" ? chunk.errorText : "",
                isError: true,
              }
            : {
                result: chunk.output as ReadonlyJSONValue,
                isError: false,
                ...(chunk.preliminary ? { isPreliminary: true } : {}),
              };
        tool.pendingResults.push(pendingResult);
        if (!pendingResult.isPreliminary) tool.hasFinalResult = true;
        if (tool.emitted || opensCall) emitPendingTool(controller, tool);
        return;
      }

      if (chunk.type === "tool-approval-request") {
        if (
          typeof chunk.toolCallId !== "string" ||
          typeof chunk.approvalId !== "string"
        )
          return;
        // Mirrors the approval the AI SDK keeps on its tool UI part, which it
        // expects back with the decision; `prompt` repeats the reason for renderers.
        controller.enqueue({
          type: "tool-approval-request",
          toolCallId: chunk.toolCallId,
          approval: {
            id: chunk.approvalId,
            ...(chunk.approvalDescriptor != null && {
              descriptor: chunk.approvalDescriptor,
            }),
            ...(Object.hasOwn(chunk, "inputSchemaInput") && {
              inputSchemaInput: chunk.inputSchemaInput,
            }),
            ...(typeof chunk.reason === "string" && {
              prompt: chunk.reason,
              requestReason: chunk.reason,
            }),
            ...(typeof chunk.isAutomatic === "boolean" && {
              isAutomatic: chunk.isAutomatic,
            }),
            ...(typeof chunk.signature === "string" && {
              signature: chunk.signature,
            }),
          },
        });
        return;
      }
      if (chunk.type === "tool-approval-response") {
        if (
          typeof chunk.approvalId !== "string" ||
          typeof chunk.approved !== "boolean"
        )
          return;
        controller.enqueue({
          type: "tool-approval-response",
          approvalId: chunk.approvalId,
          approved: chunk.approved,
          ...(typeof chunk.reason === "string" && { reason: chunk.reason }),
        });
        return;
      }
      if (chunk.type === "tool-output-denied") {
        if (typeof chunk.toolCallId !== "string") return;
        controller.enqueue({
          type: "tool-output-denied",
          toolCallId: chunk.toolCallId,
        });
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
