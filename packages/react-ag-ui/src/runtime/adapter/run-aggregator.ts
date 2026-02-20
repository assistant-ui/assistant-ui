"use client";

import type {
  ChatModelRunResult,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type { AgUiEvent } from "../types";
import type { Logger } from "../logger";

type Emit = (update: ChatModelRunResult) => void;

type ToolCallState = {
  toolCallId: string;
  toolCallName: string;
  argsText: string;
  parsedArgs: Record<string, unknown> | undefined;
  result: unknown;
  isError: boolean | undefined;
  parentMessageId?: string;
};

export type RunAggregatorOptions = {
  showThinking: boolean;
  logger: Logger;
  emit: Emit;
};

/**
 * Collects AG-UI events into assistant-ui run snapshots that can be yielded from a ChatModelAdapter.
 *
 * The aggregator keeps a single assistant message worth of parts. Each incoming event updates the parts and
 * emits a fresh snapshot through the provided `emit` callback.
 */
export class RunAggregator {
  private readonly emitUpdate: Emit;
  private readonly showThinking: boolean;
  private readonly logger: Logger;

  private status: ChatModelRunResult["status"] | undefined;
  private readonly textParts = new Map<
    string,
    { buffer: string; touched: boolean }
  >();
  private activeTextMessageId: string | undefined;
  private reasoningBuffer = "";
  private reasoningActive = false;
  private readonly toolCalls = new Map<string, ToolCallState>();
  private readonly partOrder: (
    | { kind: "text"; key: string }
    | { kind: "reasoning" }
    | { kind: "tool-call"; toolCallId: string }
  )[] = [];
  private hasReasoningPart = false;
  private textPartCounter = 0;

  constructor(options: RunAggregatorOptions) {
    this.emitUpdate = options.emit;
    this.showThinking = options.showThinking;
    this.logger = options.logger;
  }

  handle(event: AgUiEvent): void {
    switch (event.type) {
      case "RUN_STARTED": {
        this.clearTextParts();
        this.reasoningBuffer = "";
        this.reasoningActive = false;
        this.toolCalls.clear();
        this.partOrder.length = 0;
        this.hasReasoningPart = false;
        this.textPartCounter = 0;
        this.activeTextMessageId = undefined;
        this.status = { type: "running" };
        this.emit();
        break;
      }
      case "RUN_FINISHED": {
        const hasUnresolvedToolCalls = Array.from(this.toolCalls.values()).some(
          (tc) => tc.result === undefined,
        );

        this.status = hasUnresolvedToolCalls
          ? { type: "requires-action", reason: "tool-calls" }
          : { type: "complete", reason: "unknown" };
        this.emit();
        break;
      }
      case "RUN_ERROR": {
        this.status = {
          type: "incomplete",
          reason: "error",
          ...(event.message !== undefined ? { error: event.message } : {}),
        };
        this.emit();
        break;
      }
      case "RUN_CANCELLED": {
        this.status = { type: "incomplete", reason: "cancelled" };
        this.emit();
        break;
      }

      case "TEXT_MESSAGE_START": {
        const id = this.startTextMessage(event.messageId);
        if (id) {
          this.markTextPartTouched(id);
        }
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_CONTENT":
      case "TEXT_MESSAGE_CHUNK": {
        if (!event.delta) break;
        const id = this.resolveTextMessageId(
          "messageId" in event ? event.messageId : undefined,
        );
        this.appendText(id, event.delta);
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_END": {
        if (event.messageId && this.activeTextMessageId === event.messageId) {
          this.activeTextMessageId = undefined;
        }
        this.emit();
        break;
      }

      case "THINKING_START":
      case "THINKING_TEXT_MESSAGE_START": {
        if (!this.showThinking) break;
        this.reasoningActive = true;
        if (!this.reasoningBuffer) this.reasoningBuffer = "";
        this.ensureReasoningPart();
        this.emit();
        break;
      }
      case "THINKING_TEXT_MESSAGE_CONTENT": {
        if (!this.showThinking || !event.delta) break;
        this.reasoningBuffer += event.delta;
        this.ensureReasoningPart();
        this.emit();
        break;
      }
      case "THINKING_TEXT_MESSAGE_END":
      case "THINKING_END": {
        if (!this.showThinking) break;
        this.emit();
        break;
      }

      case "TOOL_CALL_START": {
        this.startToolCall(
          event.toolCallId,
          event.toolCallName,
          event.parentMessageId,
        );
        this.emit();
        break;
      }
      case "TOOL_CALL_ARGS":
      case "TOOL_CALL_CHUNK": {
        if (!event.delta) break;
        this.appendToolArgs(event.toolCallId, event.delta);
        this.emit();
        break;
      }
      case "TOOL_CALL_END": {
        this.emit();
        break;
      }
      case "TOOL_CALL_RESULT": {
        this.finishToolCall(
          event.toolCallId,
          event.content ?? "",
          event.role === "tool" ? false : undefined,
        );
        this.emit();
        break;
      }

      default: {
        this.logger.debug?.("[agui] aggregator ignored event", event);
      }
    }
  }

  private clearTextParts(): void {
    this.textParts.clear();
  }

  private generateTextKey(): string {
    this.textPartCounter += 1;
    return `text-${this.textPartCounter}`;
  }

  private startTextMessage(messageId?: string): string {
    const id = messageId ?? this.generateTextKey();
    this.ensureTextPart(id);
    this.activeTextMessageId = id;
    return id;
  }

  private resolveTextMessageId(messageId?: string): string {
    if (messageId) {
      this.ensureTextPart(messageId);
      this.activeTextMessageId = messageId;
      return messageId;
    }

    if (this.activeTextMessageId) {
      return this.activeTextMessageId;
    }

    const generated = this.generateTextKey();
    this.ensureTextPart(generated);
    this.activeTextMessageId = generated;
    return generated;
  }

  private ensureTextPart(id: string): void {
    if (!this.textParts.has(id)) {
      this.textParts.set(id, { buffer: "", touched: false });
      if (
        !this.partOrder.some((part) => part.kind === "text" && part.key === id)
      ) {
        this.partOrder.push({ kind: "text", key: id });
      }
    }
  }

  private markTextPartTouched(id: string): void {
    const entry = this.textParts.get(id);
    if (!entry) return;
    entry.touched = true;
  }

  private appendText(id: string, delta: string): void {
    this.ensureTextPart(id);
    const entry = this.textParts.get(id);
    if (!entry) return;
    entry.buffer += delta;
    entry.touched = true;
  }

  private startToolCall(
    id: string | undefined,
    name?: string,
    parentMessageId?: string,
  ) {
    if (!id) return;
    if (
      !this.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      this.partOrder.push({ kind: "tool-call", toolCallId: id });
    }
    const state: ToolCallState = {
      toolCallId: id,
      toolCallName: name ?? "tool",
      argsText: "",
      parsedArgs: undefined,
      result: undefined,
      isError: undefined,
    };
    if (parentMessageId) {
      state.parentMessageId = parentMessageId;
    }
    this.toolCalls.set(id, state);
  }

  private appendToolArgs(id: string | undefined, delta: string) {
    const entry = id ? this.toolCalls.get(id) : undefined;
    if (!entry) return;
    entry.argsText += delta;
    try {
      const parsed = JSON.parse(entry.argsText);
      if (parsed && typeof parsed === "object") {
        entry.parsedArgs = parsed as Record<string, unknown>;
      } else {
        entry.parsedArgs = undefined;
      }
    } catch {
      entry.parsedArgs = undefined;
    }
  }

  private finishToolCall(id: string, content: string, isError?: boolean) {
    if (!id) return;
    let entry = this.toolCalls.get(id);
    if (!entry) {
      entry = {
        toolCallId: id,
        toolCallName: "tool",
        argsText: "",
        parsedArgs: undefined,
        result: undefined,
        isError: undefined,
      };
      this.toolCalls.set(id, entry);
    }
    if (
      !this.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      this.partOrder.push({ kind: "tool-call", toolCallId: id });
    }
    entry.result = this.tryParseJSON(content);
    entry.isError = isError;
  }

  private tryParseJSON(value: string): unknown {
    if (!value) return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private emit(): void {
    const snapshot: ThreadAssistantMessagePart[] = [];

    for (const part of this.partOrder) {
      if (part.kind === "reasoning") {
        if (
          this.showThinking &&
          (this.reasoningActive || this.reasoningBuffer.length > 0)
        ) {
          snapshot.push({
            type: "reasoning",
            text: this.reasoningBuffer,
          } as const);
        }
        continue;
      }

      if (part.kind === "text") {
        const entry = this.textParts.get(part.key);
        if (entry?.touched) {
          snapshot.push({ type: "text", text: entry.buffer } as const);
        }
        continue;
      }

      const entry = this.toolCalls.get(part.toolCallId);
      if (!entry) continue;
      const toolPart: ToolCallMessagePart = {
        type: "tool-call",
        toolCallId: entry.toolCallId,
        toolName: entry.toolCallName,
        args: (entry.parsedArgs ?? {}) as any,
        argsText: entry.argsText,
        ...(entry.result !== undefined ? { result: entry.result } : {}),
        ...(entry.isError !== undefined ? { isError: entry.isError } : {}),
        ...(entry.parentMessageId ? { parentId: entry.parentMessageId } : {}),
      } as ToolCallMessagePart;
      snapshot.push(toolPart);
    }

    const result: ChatModelRunResult = {
      content: snapshot,
      ...(this.status ? { status: this.status } : undefined),
    };
    this.emitUpdate(result);
  }

  private ensureReasoningPart(): void {
    if (this.hasReasoningPart) return;
    // ensure reasoning appears before the first text segment if possible
    const textIndex = this.partOrder.findIndex((part) => part.kind === "text");
    if (textIndex === -1) {
      this.partOrder.push({ kind: "reasoning" });
    } else {
      this.partOrder.splice(textIndex, 0, { kind: "reasoning" });
    }
    this.hasReasoningPart = true;
  }
}
