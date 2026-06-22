"use client";

import {
  isMcpAppUri,
  type ChatModelRunResult,
  type MessageTiming,
  type ThreadAssistantMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AgUiEvent, AgUiInterrupt } from "../types";
import type { Logger } from "../logger";

export const AG_UI_METADATA_NAMESPACE = "agui";

export type AgUiCustomMetadata = {
  interrupts?: AgUiInterrupt[];
};

type Emit = (update: ChatModelRunResult) => void;

type ToolCallState = {
  toolCallId: string;
  toolCallName: string;
  argsText: string;
  parsedArgs: Record<string, unknown> | undefined;
  result: unknown;
  isError: boolean | undefined;
  parentMessageId?: string;
  toolMessageId?: string;
  mcpAppResourceUri?: string;
};

const MCP_APPS_ACTIVITY_TYPE = "mcp-apps";

export type RunAggregatorOptions = {
  showThinking: boolean;
  logger: Logger;
  emit: Emit;
  onServerMessageId?: (messageId: string) => void;
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
  private readonly onServerMessageId: ((messageId: string) => void) | undefined;

  private status: ChatModelRunResult["status"] | undefined;
  private interrupts: AgUiInterrupt[] | undefined;
  private readonly textParts = new Map<
    string,
    { buffer: string; touched: boolean }
  >();
  private activeTextMessageId: string | undefined;
  private readonly reasoningParts = new Map<string, string>(); // key → buffer
  private activeReasoningKey: string | undefined;
  private reasoningPartCounter = 0;
  private readonly toolCalls = new Map<string, ToolCallState>();
  private lastResolvedToolCallId: string | undefined;
  private readonly partOrder: (
    | { kind: "text"; key: string }
    | { kind: "reasoning"; key: string }
    | { kind: "tool-call"; toolCallId: string }
  )[] = [];
  private textPartCounter = 0;
  private serverMessageIdReported = false;

  private streamStartTime: number | undefined;
  private firstTokenTime: number | undefined;
  private totalChunks = 0;

  constructor(options: RunAggregatorOptions) {
    this.emitUpdate = options.emit;
    this.showThinking = options.showThinking;
    this.logger = options.logger;
    this.onServerMessageId = options.onServerMessageId;
  }

  hasToolCall(toolCallId: string): boolean {
    return this.toolCalls.has(toolCallId);
  }

  handle(event: AgUiEvent): void {
    switch (event.type) {
      case "RUN_STARTED": {
        this.clearTextParts();
        this.reasoningParts.clear();
        this.activeReasoningKey = undefined;
        this.reasoningPartCounter = 0;
        this.toolCalls.clear();
        this.lastResolvedToolCallId = undefined;
        this.partOrder.length = 0;
        this.textPartCounter = 0;
        this.activeTextMessageId = undefined;
        this.interrupts = undefined;
        this.serverMessageIdReported = false;
        this.streamStartTime = Date.now();
        this.firstTokenTime = undefined;
        this.totalChunks = 0;
        this.status = { type: "running" };
        this.emit();
        break;
      }
      case "RUN_FINISHED": {
        if (event.outcome?.type === "interrupt") {
          this.interrupts = event.outcome.interrupts;
          this.status = { type: "requires-action", reason: "interrupt" };
          this.emit();
          break;
        }

        this.interrupts = undefined;
        const hasUnresolvedToolCalls = Array.from(this.toolCalls.values()).some(
          (tc) => tc.result === undefined,
        );

        this.status =
          event.outcome?.type === "success" || !hasUnresolvedToolCalls
            ? { type: "complete", reason: "unknown" }
            : { type: "requires-action", reason: "tool-calls" };
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
        this.reportServerMessageId(event.messageId);
        const id = this.startTextMessage(event.messageId);
        if (id) {
          this.markTextPartTouched(id);
        }
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_CONTENT":
      case "TEXT_MESSAGE_CHUNK": {
        const incomingId = "messageId" in event ? event.messageId : undefined;
        this.reportServerMessageId(incomingId);
        if (!event.delta) break;
        this.recordFirstToken();
        const id = this.resolveTextMessageId(incomingId);
        this.appendText(id, event.delta);
        this.totalChunks++;
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_END": {
        this.reportServerMessageId(event.messageId);
        if (event.messageId && this.activeTextMessageId === event.messageId) {
          this.activeTextMessageId = undefined;
        }
        this.emit();
        break;
      }

      case "THINKING_START":
      case "THINKING_TEXT_MESSAGE_START":
      case "REASONING_START":
      case "REASONING_MESSAGE_START":
        this.handleReasoningStart(
          "messageId" in event ? event.messageId : undefined,
        );
        break;
      case "THINKING_TEXT_MESSAGE_CONTENT":
        this.handleReasoningContent(event.delta);
        this.totalChunks++;
        this.recordFirstToken();
        break;
      case "REASONING_MESSAGE_CONTENT":
        this.handleReasoningContent(
          event.delta,
          "messageId" in event ? event.messageId : undefined,
        );
        this.totalChunks++;
        this.recordFirstToken();
        break;
      case "THINKING_TEXT_MESSAGE_END":
      case "THINKING_END":
      case "REASONING_MESSAGE_END":
      case "REASONING_END":
        this.handleReasoningEnd();
        break;

      case "TOOL_CALL_START": {
        this.reportServerMessageId(event.parentMessageId);
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
        if (event.type === "TOOL_CALL_CHUNK") {
          this.reportServerMessageId(event.parentMessageId);
        }
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
          event.messageId,
        );
        this.emit();
        break;
      }
      case "ACTIVITY_SNAPSHOT": {
        if (event.activityType !== MCP_APPS_ACTIVITY_TYPE) break;
        const id = this.lastResolvedToolCallId;
        const entry = id ? this.toolCalls.get(id) : undefined;
        const resourceUri = event.content.resourceUri;
        if (
          entry &&
          typeof resourceUri === "string" &&
          isMcpAppUri(resourceUri)
        ) {
          entry.mcpAppResourceUri = resourceUri;
          this.emit();
        }
        break;
      }

      default: {
        this.logger.debug?.("[agui] aggregator ignored event", event);
      }
    }
  }

  private reportServerMessageId(messageId: string | undefined): void {
    if (this.serverMessageIdReported || !messageId) return;
    this.serverMessageIdReported = true;
    this.onServerMessageId?.(messageId);
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
    // A new tool call acts as a boundary: any anonymous text that arrives
    // after it should be a new part, not appended to the pre-tool text.
    this.activeTextMessageId = undefined;
    if (
      !this.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      this.insertToolPart(id, parentMessageId);
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

  // Place a tool-call part next to its parent message's text part rather than
  // at wire-arrival position. The messages and tool-call channels are not
  // ordered relative to each other on the wire, so a tool whose
  // TOOL_CALL_START arrives after a *later* message's text would otherwise be
  // appended below it and render out of order. Anchoring by parentMessageId
  // keeps the call under the message that spawned it. Falls back to append
  // when the parent is unknown or its text part has not arrived yet.
  private insertToolPart(id: string, parentMessageId?: string) {
    const entry = { kind: "tool-call", toolCallId: id } as const;
    if (parentMessageId) {
      const parentIndex = this.partOrder.findIndex(
        (part) => part.kind === "text" && part.key === parentMessageId,
      );
      if (parentIndex !== -1) {
        // Insert after the parent's text and any sibling tool calls already
        // anchored to the same parent, preserving their relative order.
        let insertAt = parentIndex + 1;
        while (insertAt < this.partOrder.length) {
          const part = this.partOrder[insertAt];
          if (
            part?.kind === "tool-call" &&
            this.toolCalls.get(part.toolCallId)?.parentMessageId ===
              parentMessageId
          ) {
            insertAt += 1;
            continue;
          }
          break;
        }
        this.partOrder.splice(insertAt, 0, entry);
        return;
      }
    }
    this.partOrder.push(entry);
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

  private finishToolCall(
    id: string,
    content: string,
    isError?: boolean,
    toolMessageId?: string,
  ) {
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
    entry.result = tryParseJSON(content);
    entry.isError = isError;
    if (toolMessageId) {
      entry.toolMessageId = toolMessageId;
    }
    this.lastResolvedToolCallId = id;
  }

  private emit(): void {
    const snapshot: ThreadAssistantMessagePart[] = [];

    for (const part of this.partOrder) {
      if (part.kind === "reasoning") {
        if (this.showThinking) {
          const buffer = this.reasoningParts.get(part.key) ?? "";
          if (buffer.length > 0 || this.activeReasoningKey === part.key) {
            snapshot.push({ type: "reasoning", text: buffer } as const);
          }
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
        ...(entry.mcpAppResourceUri
          ? { mcp: { app: { resourceUri: entry.mcpAppResourceUri } } }
          : {}),
        ...(entry.parentMessageId ? { parentId: entry.parentMessageId } : {}),
        ...(entry.toolMessageId
          ? { unstable_toolMessageId: entry.toolMessageId }
          : {}),
      } as ToolCallMessagePart & { unstable_toolMessageId?: string };
      snapshot.push(toolPart);
    }

    const timing = this.getTiming();
    const metadata = {
      ...(timing ? { timing } : {}),
      ...(this.interrupts
        ? {
            custom: {
              [AG_UI_METADATA_NAMESPACE]: {
                interrupts: this.interrupts,
              } satisfies AgUiCustomMetadata,
            },
          }
        : {}),
    };
    const result: ChatModelRunResult = {
      content: snapshot,
      ...(this.status ? { status: this.status } : undefined),
      ...(Object.keys(metadata).length > 0 ? { metadata } : undefined),
    };
    this.emitUpdate(result);
  }

  private recordFirstToken(): void {
    if (
      this.firstTokenTime === undefined &&
      this.streamStartTime !== undefined
    ) {
      this.firstTokenTime = Date.now() - this.streamStartTime;
    }
  }

  private getTiming(): MessageTiming | undefined {
    if (this.streamStartTime === undefined) return undefined;

    const now = Date.now();
    const totalStreamTime = now - this.streamStartTime;
    const tokenCount =
      this.totalChunks > 0
        ? Math.ceil(
            Array.from(this.textParts.values()).reduce(
              (sum, p) => sum + p.buffer.length,
              0,
            ) / 4,
          )
        : undefined;
    const tokensPerSecond =
      tokenCount && totalStreamTime > 0
        ? (tokenCount / totalStreamTime) * 1000
        : undefined;

    return {
      streamStartTime: this.streamStartTime,
      ...(this.firstTokenTime !== undefined
        ? { firstTokenTime: this.firstTokenTime }
        : {}),
      totalStreamTime,
      ...(tokenCount !== undefined ? { tokenCount } : {}),
      ...(tokensPerSecond !== undefined ? { tokensPerSecond } : {}),
      totalChunks: this.totalChunks,
      toolCallCount: this.toolCalls.size,
    };
  }

  private handleReasoningStart(messageId?: string): void {
    if (!this.showThinking) return;
    // A reasoning block acts as a boundary: anonymous text arriving after it
    // should be a new part, not appended to any pre-reasoning text.
    this.activeTextMessageId = undefined;
    const key = messageId ?? `__auto-reasoning-${++this.reasoningPartCounter}`;
    if (!this.reasoningParts.has(key)) {
      this.reasoningParts.set(key, "");
      this.partOrder.push({ kind: "reasoning", key });
    }
    this.activeReasoningKey = key;
    this.emit();
  }

  private handleReasoningContent(delta: string, messageId?: string): void {
    if (!this.showThinking || !delta) return;
    if (!this.activeReasoningKey) {
      // Content arrived without a preceding START — create the slot lazily.
      this.handleReasoningStart(messageId);
    }
    const key = this.activeReasoningKey;
    if (!key) return;
    this.reasoningParts.set(key, (this.reasoningParts.get(key) ?? "") + delta);
    this.emit();
  }

  private handleReasoningEnd(): void {
    if (!this.showThinking) return;
    this.activeReasoningKey = undefined;
    this.emit();
  }
}

export function tryParseJSON(value: string): unknown {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
