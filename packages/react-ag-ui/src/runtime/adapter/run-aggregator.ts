"use client";

import {
  isMcpAppUri,
  type ChatModelRunResult,
  type MessagePartTiming,
  type MessageStatus,
  type MessageTiming,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePart,
  type ToolModelContentPart,
} from "@assistant-ui/core";
import type { JoinStrategy } from "@assistant-ui/core/react";
import type { ContentPart } from "@ag-ui/client";
import {
  applyA2uiOperations,
  surfaceToPresentToolCall,
  type A2uiState,
  type A2uiSurfaceState,
} from "@assistant-ui/generative-ui/a2ui";
import jsonpatch, { type Operation } from "fast-json-patch";
import { readMcpAppResourceUri, toolContentText } from "../mcp-tool-result";
import { projectAgUiToolApprovals } from "./tool-approval";
import { withAgUiPartMessageMetadata } from "./conversions";
import {
  AG_UI_METADATA_NAMESPACE,
  A2UI_SURFACE_ACTIVITY_TYPE,
  MCP_APPS_ACTIVITY_TYPE,
  type AgUiCustomMetadata,
  type AgUiEvent,
  type AgUiInterrupt,
  type AgUiOpaqueReasoning,
  MAX_SUBAGENT_DEPTH,
} from "../types";
import type { Logger } from "../logger";

const ROOT_SCOPE = "";

type SubagentRunState = {
  subagentRunId: string;
  name: string;
  description?: string;
  parentSubagentRunId?: string;
  parentToolCallId?: string;
  parentMessageId?: string;
  createdAt: Date;
  status: MessageStatus;
  result?: unknown;
  interruptIds?: string[];
  errorCode?: string;
};

type ToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

type PartOrderEntry =
  | { kind: "text"; key: string; subagentRunId?: string }
  | { kind: "reasoning"; key: string; subagentRunId?: string }
  | { kind: "tool-call"; toolCallId: string }
  | { kind: "data"; name: string; value: unknown; subagentRunId?: string };

type BuildContext = {
  subagentsByParentToolCallId: Map<string, string[]>;
  reachable: Set<string>;
  approvals: ReadonlyMap<string, ToolApproval>;
  // partOrder bucketed by the scope each part renders in, so one emit walks
  // every part once however many subagents the run spawned.
  partsByScope: Map<string, { index: number; part: PartOrderEntry }[]>;
  // Present only for the root walk: the pass that builds the snapshot is also
  // the one that decides where a retracted reasoning signature anchors, so the
  // two can never disagree about what materialized.
  root?: {
    opaqueCandidates: (AgUiOpaqueReasoning & { anchor: number })[];
    lastMaterializedIndex: number;
  };
};

type Emit = (update: ChatModelRunResult) => void;

type ToolCallState = {
  toolCallId: string;
  toolCallName: string;
  argsText: string;
  argsTextScanner?: JSONContainerScanner | undefined;
  parsedArgs: Record<string, unknown> | undefined;
  result: unknown;
  isError: boolean | undefined;
  parentMessageId?: string;
  toolMessageId?: string;
  mcpAppResourceUri?: string;
  mcpAppServerId?: string;
  artifact?: unknown;
  modelContent?: ToolModelContentPart[];
  resultMetadata?: Record<string, unknown>;
  snapshotResultApplied: boolean;
  subagentRunId?: string;
};

type JSONContainerScanner = {
  state: "pending" | "open" | "complete" | "invalid";
  stack: ("{" | "[")[];
  inString: boolean;
  escaped: boolean;
};

const createJSONContainerScanner = (): JSONContainerScanner => ({
  state: "pending",
  stack: [],
  inString: false,
  escaped: false,
});

const isJSONWhitespace = (char: string): boolean =>
  char === " " || char === "\t" || char === "\n" || char === "\r";

const scanJSONContainerDelta = (
  scanner: JSONContainerScanner,
  delta: string,
): boolean => {
  let completed = false;

  for (const char of delta) {
    if (scanner.state === "invalid") continue;
    if (scanner.state === "complete") {
      if (isJSONWhitespace(char)) continue;
      scanner.state = "invalid";
      continue;
    }
    if (scanner.state === "pending") {
      if (isJSONWhitespace(char)) continue;
      if (char !== "{" && char !== "[") {
        scanner.state = "invalid";
        continue;
      }
      scanner.state = "open";
      scanner.stack.push(char);
      continue;
    }
    if (scanner.inString) {
      if (scanner.escaped) {
        scanner.escaped = false;
      } else if (char === "\\") {
        scanner.escaped = true;
      } else if (char === '"') {
        scanner.inString = false;
      }
      continue;
    }
    if (char === '"') {
      scanner.inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      scanner.stack.push(char);
      continue;
    }
    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (scanner.stack.pop() !== expected) {
        scanner.state = "invalid";
        continue;
      }
      if (scanner.stack.length === 0) {
        scanner.state = "complete";
        completed = true;
      }
    }
  }

  return completed && scanner.state === "complete";
};

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// One assistant message worth of parts. A run that moves on to another
// message keeps the previous buffer, so later events naming it still land.
type MessageBuffer = {
  id: string | undefined;
  textParts: Map<string, { buffer: string }>;
  openTextFrames: Set<string>;
  activeTextMessageIdByScope: Map<string, string>;
  reasoningParts: Map<string, { buffer: string; timing?: MessagePartTiming }>;
  reasoningSignatures: Map<string, string>;
  reasoningSignatureIds: Map<string, string>;
  hiddenSignatures: Map<string, string>;
  hiddenSignatureAnchors: Map<string, number>;
  hiddenBlockAnchors: Map<string, number>;
  hiddenReasoningIds: Set<string>;
  hiddenActiveReasoningId: string | undefined;
  hasEmittedOpaqueReasoning: boolean;
  loggedDroppedOpaqueIds: Set<string>;
  reasoningMessageIds: Map<string, string>;
  activeReasoningKeyByScope: Map<string, string>;
  subagentRuns: Map<string, SubagentRunState>;
  // The nesting graph only moves when a run is announced or a tool call is
  // created, which is rare next to emit(), so it is derived once per change
  // rather than per streamed delta.
  nestingMemo:
    | {
        subagentsByParentToolCallId: Map<string, string[]>;
        reachable: Set<string>;
      }
    | undefined;
  toolCalls: Map<string, ToolCallState>;
  a2uiBuckets: Map<string, A2uiState>;
  a2uiToolCallIds: Set<string>;
  activityParts: Map<
    string,
    { kind: "data"; name: string; value: unknown; subagentRunId?: string }
  >;
  lastResolvedToolCallIdByScope: Map<string, string>;
  partOrder: PartOrderEntry[];
  lastReasoningBeforeToolCall: PartOrderEntry | undefined;
  textPartCounter: number;
  reportedServerMessageId: string | undefined;
};

const createMessageBuffer = (id?: string): MessageBuffer => ({
  id,
  textParts: new Map(),
  openTextFrames: new Set(),
  activeTextMessageIdByScope: new Map(),
  reasoningParts: new Map(),
  reasoningSignatures: new Map(),
  reasoningSignatureIds: new Map(),
  hiddenSignatures: new Map(),
  hiddenSignatureAnchors: new Map(),
  hiddenBlockAnchors: new Map(),
  hiddenReasoningIds: new Set(),
  hiddenActiveReasoningId: undefined,
  hasEmittedOpaqueReasoning: false,
  loggedDroppedOpaqueIds: new Set(),
  reasoningMessageIds: new Map(),
  activeReasoningKeyByScope: new Map(),
  subagentRuns: new Map(),
  nestingMemo: undefined,
  toolCalls: new Map(),
  a2uiBuckets: new Map(),
  a2uiToolCallIds: new Set(),
  activityParts: new Map(),
  lastResolvedToolCallIdByScope: new Map(),
  partOrder: [],
  lastReasoningBeforeToolCall: undefined,
  textPartCounter: 0,
  reportedServerMessageId: undefined,
});

export type RetainedMessageState = {
  messageId: string;
  /** A root text frame or a sub-agent run is still open. */
  streaming: boolean;
  openToolCallIds: string[];
};

export type RunAggregatorOptions = {
  showThinking: boolean;
  joinStrategy?: JoinStrategy | undefined;
  logger: Logger;
  emit: Emit;
  onRetainedMessage?: (
    update: ChatModelRunResult,
    state: RetainedMessageState,
  ) => void;
  canRetainMessage?: (messageId: string) => boolean;
  onServerMessageId?: (messageId: string) => void;
  /** Returns the id the outgoing message lives under, when it may keep receiving events. */
  onTextMessageStart?: (
    messageId: string,
    openToolCallIds: string[],
  ) => string | void;
};

/**
 * Collects AG-UI events into assistant-ui run snapshots that can be yielded from a ChatModelAdapter.
 *
 * Each incoming event updates the parts of the assistant message it names and
 * emits a fresh snapshot: through `emit` for the message the run streams into,
 * and through `onRetainedMessage` for one it moved on from. `CUSTOM` events
 * become canonical data parts; integration plumbing names such as
 * `on_interrupt`, `PredictState`, `Exit`, `hook_error`, `state_update_error`,
 * `system:*`, and `MultiAgentHandoff` are forwarded the same way, so apps only
 * need data renderers for names they own.
 */
export class RunAggregator {
  private readonly emitUpdate: Emit;
  private readonly showThinking: boolean;
  private readonly joinStrategy: JoinStrategy | undefined;
  private readonly logger: Logger;
  private readonly onServerMessageId: ((messageId: string) => void) | undefined;
  private readonly onTextMessageStart: RunAggregatorOptions["onTextMessageStart"];
  private readonly onRetainedMessage: RunAggregatorOptions["onRetainedMessage"];
  private readonly canRetainMessage: RunAggregatorOptions["canRetainMessage"];

  private status: ChatModelRunResult["status"] | undefined;
  private interrupts: AgUiInterrupt[] | undefined;
  private pendingToolCallIds: string[] | undefined;
  private readonly pendingSnapshotText = new Map<string, string>();
  private current: MessageBuffer = createMessageBuffer();
  // The buffer the event being handled routes to; equal to `current` except
  // while an event naming a moved-off message is applied.
  private buf: MessageBuffer = this.current;
  private readonly retained = new Map<string, MessageBuffer>();
  private unannounced: MessageBuffer | undefined;
  private serverMessageIdReported = false;
  private lastTextMessageId: string | undefined;

  private streamStartTime: number | undefined;
  private firstTokenTime: number | undefined;
  private totalChunks = 0;

  constructor(options: RunAggregatorOptions) {
    this.emitUpdate = options.emit;
    this.showThinking = options.showThinking;
    this.joinStrategy = options.joinStrategy;
    this.logger = options.logger;
    this.onServerMessageId = options.onServerMessageId;
    this.onTextMessageStart = options.onTextMessageStart;
    this.onRetainedMessage = options.onRetainedMessage;
    this.canRetainMessage = options.canRetainMessage;
  }

  hasToolCall(toolCallId: string): boolean {
    return this.buffers().some((buffer) => buffer.toolCalls.has(toolCallId));
  }

  isRetained(messageId: string): boolean {
    return this.retained.has(messageId);
  }

  /**
   * Makes `messageId` the message the run streams into. The previous message
   * keeps its parts under `previousId`, and returns true when it does; call
   * `announceRetained` to publish its state once the caller can apply it.
   */
  rebaseMessage(messageId: string, previousId?: string): boolean {
    const retained = this.openMessage(messageId, previousId);
    this.lastTextMessageId = messageId;
    this.current.reportedServerMessageId = messageId;
    this.startTextMessage(ROOT_SCOPE, messageId);
    if (retained) this.unannounced = retained;
    return retained !== undefined;
  }

  announceRetained(): void {
    const buffer = this.unannounced;
    this.unannounced = undefined;
    if (buffer && this.retained.get(buffer.id!) === buffer)
      this.withBuffer(buffer, () => this.emit());
  }

  handle(event: AgUiEvent): void {
    const owner = this.ownerOf(event);
    if (owner === this.current) this.apply(event);
    else this.withBuffer(owner, () => this.apply(event));
  }

  private buffers(): MessageBuffer[] {
    return [this.current, ...this.retained.values()];
  }

  private withBuffer(buffer: MessageBuffer, fn: () => void): void {
    const previous = this.buf;
    this.buf = buffer;
    try {
      fn();
    } finally {
      this.buf = previous;
    }
  }

  // Starts a fresh current message (or resumes a retained one) and keeps the
  // outgoing one addressable by id, so events that still name it route back.
  private openMessage(
    messageId: string,
    previousId: string | undefined,
  ): MessageBuffer | undefined {
    const outgoing = this.current;
    const next = this.retained.get(messageId) ?? createMessageBuffer(messageId);
    this.retained.delete(messageId);
    let retained: MessageBuffer | undefined;
    if (previousId !== undefined && previousId !== messageId) {
      outgoing.id = previousId;
      this.retained.set(previousId, outgoing);
      retained = outgoing;
    }
    this.current = next;
    this.buf = next;
    return retained;
  }

  private ownerForMessage(messageId: string | undefined): MessageBuffer {
    if (!messageId || messageId === this.current.id) return this.current;
    const retained = this.retained.get(messageId);
    if (retained) return retained;
    // A snapshot can deliver a message before the events that finish it, as
    // a reconnect replay does.
    if (this.canRetainMessage?.(messageId)) {
      const buffer = createMessageBuffer(messageId);
      this.retained.set(messageId, buffer);
      if (this.pendingSnapshotText.has(messageId))
        this.withBuffer(buffer, () =>
          this.startTextMessage(ROOT_SCOPE, messageId),
        );
      return buffer;
    }
    return this.current;
  }

  private ownerForToolCall(toolCallId: unknown): MessageBuffer | undefined {
    if (typeof toolCallId !== "string") return undefined;
    return this.buffers().find((buffer) => buffer.toolCalls.has(toolCallId));
  }

  private ownerForSubagent(subagentRunId: string): MessageBuffer {
    return (
      this.buffers().find((buffer) => buffer.subagentRuns.has(subagentRunId)) ??
      this.current
    );
  }

  private ownerOf(event: AgUiEvent): MessageBuffer {
    if (this.joinStrategy === "concat-content") return this.current;
    switch (event.type) {
      case "TEXT_MESSAGE_START":
      case "TEXT_MESSAGE_CONTENT":
      case "TEXT_MESSAGE_END":
        return event.subagentRunId !== undefined
          ? this.ownerForSubagent(event.subagentRunId)
          : this.ownerForMessage(event.messageId);
      case "TOOL_CALL_START":
        return event.subagentRunId !== undefined
          ? this.ownerForSubagent(event.subagentRunId)
          : this.ownerForMessage(event.parentMessageId);
      case "TOOL_CALL_ARGS":
      case "TOOL_CALL_END":
      case "TOOL_CALL_RESULT":
        return (
          this.ownerForToolCall(event.toolCallId) ??
          (event.subagentRunId !== undefined
            ? this.ownerForSubagent(event.subagentRunId)
            : this.current)
        );
      case "SUBAGENT_STARTED": {
        const existing = this.buffers().find((buffer) =>
          buffer.subagentRuns.has(event.subagentRunId),
        );
        if (existing) return existing;
        if (event.parentToolCallId !== undefined) {
          const owner = this.ownerForToolCall(event.parentToolCallId);
          if (owner) return owner;
        }
        if (event.parentSubagentRunId !== undefined)
          return this.ownerForSubagent(event.parentSubagentRunId);
        return this.ownerForMessage(event.parentMessageId);
      }
      case "SUBAGENT_FINISHED":
      case "SUBAGENT_ERROR":
        return this.ownerForSubagent(event.subagentRunId);
      case "ACTIVITY_SNAPSHOT":
        if (event.activityType === MCP_APPS_ACTIVITY_TYPE) {
          const owner = this.ownerForToolCall(event.content.toolCallId);
          if (owner) return owner;
        }
        if (event.activityType === A2UI_SURFACE_ACTIVITY_TYPE)
          return this.current;
        return event.subagentRunId !== undefined
          ? this.ownerForSubagent(event.subagentRunId)
          : this.current;
      case "ACTIVITY_DELTA":
        if (event.subagentRunId !== undefined)
          return this.ownerForSubagent(event.subagentRunId);
        return (
          this.buffers().find((buffer) =>
            buffer.activityParts.has(`message:${event.messageId}`),
          ) ?? this.current
        );
      case "REASONING_START":
      case "REASONING_MESSAGE_START":
      case "REASONING_MESSAGE_CONTENT":
      case "REASONING_MESSAGE_END":
      case "REASONING_END":
      case "REASONING_ENCRYPTED_VALUE": {
        if (event.subagentRunId !== undefined)
          return this.ownerForSubagent(event.subagentRunId);
        const id =
          event.type === "REASONING_ENCRYPTED_VALUE"
            ? event.entityId
            : event.messageId;
        return (
          this.buffers().find(
            (buffer) =>
              buffer.reasoningParts.has(id) ||
              buffer.hiddenReasoningIds.has(id),
          ) ?? this.current
        );
      }
      default:
        return this.current;
    }
  }

  private retainedState(buffer: MessageBuffer): RetainedMessageState {
    const openToolCallIds = Array.from(buffer.toolCalls.values())
      .filter(
        (call) =>
          call.result === undefined &&
          !buffer.a2uiToolCallIds.has(call.toolCallId),
      )
      .map((call) => call.toolCallId);
    return {
      messageId: buffer.id!,
      openToolCallIds,
      streaming:
        buffer.openTextFrames.size > 0 ||
        Array.from(buffer.subagentRuns.values()).some(
          (run) => run.status.type === "running",
        ),
    };
  }

  private apply(event: AgUiEvent): void {
    switch (event.type) {
      case "RUN_STARTED": {
        this.retained.clear();
        this.unannounced = undefined;
        const { hasEmittedOpaqueReasoning } = this.current;
        this.current = createMessageBuffer();
        // A resumed message must still retract what the previous run published.
        this.current.hasEmittedOpaqueReasoning = hasEmittedOpaqueReasoning;
        this.buf = this.current;
        this.pendingSnapshotText.clear();
        this.interrupts = undefined;
        this.serverMessageIdReported = false;
        this.lastTextMessageId = undefined;
        this.streamStartTime = Date.now();
        this.firstTokenTime = undefined;
        this.totalChunks = 0;
        this.status = { type: "running" };
        this.emit();
        break;
      }
      case "MESSAGES_SNAPSHOT": {
        this.pendingSnapshotText.clear();
        const buffers = this.buffers();
        for (const message of event.messages) {
          if (message?.role !== "assistant") continue;
          if (typeof message.content === "string") {
            const part = buffers
              .map((buffer) => buffer.textParts.get(message.id))
              .find((entry) => entry !== undefined);
            if (part) part.buffer = message.content;
            else this.pendingSnapshotText.set(message.id, message.content);
          }
          // A call the stream opened without args takes the record's, so the
          // message it stays on matches what a reload would show.
          for (const call of Array.isArray(message.toolCalls)
            ? message.toolCalls
            : []) {
            const args = call?.function?.arguments;
            if (typeof args !== "string" || args.length === 0) continue;
            for (const buffer of buffers) {
              const entry = buffer.toolCalls.get(call.id);
              if (entry === undefined || entry.argsText !== "") continue;
              entry.argsText = args;
              entry.argsTextScanner = createJSONContainerScanner();
              scanJSONContainerDelta(entry.argsTextScanner, args);
              const parsed = tryParseJSON(args);
              entry.parsedArgs = isPlainObject(parsed) ? parsed : undefined;
            }
          }
        }
        break;
      }
      case "RUN_FINISHED": {
        if (event.outcome?.type === "cancelled") {
          this.interrupts = undefined;
          this.status = { type: "incomplete", reason: "cancelled" };
          this.closeOpenSubagentRuns(this.status);
          this.emit();
          break;
        }
        if (event.outcome?.type === "interrupt") {
          this.interrupts = event.outcome.interrupts;
          this.status = { type: "requires-action", reason: "interrupt" };
          this.emit();
          break;
        }

        this.interrupts = undefined;
        // A call nested inside a subagent message is answerable the same way
        // a root call is: getPendingToolCalls and addToolResult walk
        // ToolCallMessagePart.messages, so any unresolved call keeps the run
        // resumable.
        const pendingToolCallIds =
          event.outcome?.type === "success"
            ? event.outcome.pendingToolCallIds
            : undefined;
        const hasUnresolvedToolCalls =
          pendingToolCallIds && pendingToolCallIds.length > 0
            ? pendingToolCallIds.some((id) => {
                const call = this.buf.toolCalls.get(id);
                return call !== undefined && call.result === undefined;
              })
            : Array.from(this.buf.toolCalls.values()).some(
                (tc) => tc.result === undefined,
              );

        this.status = hasUnresolvedToolCalls
          ? { type: "requires-action", reason: "tool-calls" }
          : { type: "complete", reason: "unknown" };
        this.pendingToolCallIds =
          hasUnresolvedToolCalls && pendingToolCallIds?.length
            ? pendingToolCallIds
            : undefined;
        this.closeOpenSubagentRuns(this.status);
        this.emit();
        break;
      }
      case "RUN_ERROR": {
        this.status = {
          type: "incomplete",
          reason: "error",
          ...(event.message !== undefined ? { error: event.message } : {}),
        };
        this.closeOpenSubagentRuns(this.status);
        this.emit();
        break;
      }
      case "RUN_CANCELLED": {
        // A cancel can land after RUN_FINISHED while the response is still
        // closing: the finished answer stays complete, and an interrupt the run
        // already delivered stays answerable.
        if (
          this.status?.type === "complete" ||
          (this.status?.type === "requires-action" &&
            this.status.reason === "interrupt")
        )
          break;
        this.status = { type: "incomplete", reason: "cancelled" };
        this.closeOpenSubagentRuns(this.status);
        this.emit();
        break;
      }

      case "TEXT_MESSAGE_START": {
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE && this.buf === this.current) {
          this.beginDistinctTextMessage(event.messageId);
          this.reportServerMessageId(event.messageId);
          if (event.messageId) this.lastTextMessageId = event.messageId;
        }
        if (scope === ROOT_SCOPE && event.messageId)
          this.buf.openTextFrames.add(event.messageId);
        this.startTextMessage(scope, event.messageId);
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_CONTENT": {
        const incomingId = event.messageId;
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE && this.buf === this.current) {
          this.beginDistinctTextMessage(incomingId, true);
          this.reportServerMessageId(incomingId);
          if (incomingId) this.lastTextMessageId = incomingId;
        }
        if (scope === ROOT_SCOPE && incomingId)
          this.buf.openTextFrames.add(incomingId);
        if (!event.delta) break;
        this.recordFirstToken();
        const id = this.resolveTextMessageId(scope, incomingId);
        this.appendText(id, event.delta);
        this.totalChunks++;
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_END": {
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE && event.messageId) {
          if (this.buf === this.current)
            this.reportServerMessageId(event.messageId);
          this.buf.openTextFrames.delete(event.messageId);
        }
        if (
          event.messageId &&
          this.buf.activeTextMessageIdByScope.get(scope) ===
            this.partKey(scope, event.messageId)
        ) {
          this.buf.activeTextMessageIdByScope.delete(scope);
        }
        this.emit();
        break;
      }

      case "CUSTOM": {
        this.buf.activeTextMessageIdByScope.delete(ROOT_SCOPE);
        this.buf.partOrder.push({
          kind: "data",
          name: event.name,
          value: event.value,
        });
        this.emit();
        break;
      }

      case "REASONING_START":
      case "REASONING_MESSAGE_START":
        this.handleReasoningStart(
          this.scopeOf(event),
          event.messageId,
          event.type === "REASONING_MESSAGE_START",
          event.timestamp,
        );
        break;
      case "REASONING_ENCRYPTED_VALUE":
        if (event.subtype === "message") {
          const scope = this.scopeOf(event);
          const entityKey = this.partKey(scope, event.entityId);
          const key =
            this.showThinking && this.buf.reasoningParts.has(entityKey)
              ? entityKey
              : undefined;
          if (key !== undefined) {
            this.buf.reasoningSignatures.set(key, event.encryptedValue);
            this.buf.reasoningSignatureIds.set(key, event.entityId);
            this.emit();
          } else if (
            !this.showThinking &&
            scope === ROOT_SCOPE &&
            event.entityId.trim().length > 0 &&
            event.encryptedValue.trim().length > 0 &&
            this.buf.hiddenReasoningIds.has(event.entityId)
          ) {
            this.buf.hiddenSignatures.set(event.entityId, event.encryptedValue);
            this.buf.hiddenSignatureAnchors.set(
              event.entityId,
              this.buf.hiddenBlockAnchors.get(event.entityId) ??
                this.buf.partOrder.length,
            );
            this.emit();
          }
        }
        break;
      case "REASONING_MESSAGE_CONTENT":
        this.handleReasoningContent(
          this.scopeOf(event),
          event.delta,
          event.messageId,
          true,
        );
        this.totalChunks++;
        this.recordFirstToken();
        break;
      case "REASONING_MESSAGE_END":
      case "REASONING_END":
        this.handleReasoningEnd(this.scopeOf(event), event.timestamp);
        break;

      case "TOOL_CALL_START": {
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE && this.buf === this.current) {
          this.reportServerMessageId(event.parentMessageId);
        }
        this.startToolCall(
          scope,
          event.toolCallId,
          event.toolCallName,
          event.parentMessageId,
        );
        this.emit();
        break;
      }
      case "TOOL_CALL_ARGS": {
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
          this.scopeOf(event),
          event.toolCallId,
          event.content ?? "",
          typeof event.mcpResult?.isError === "boolean"
            ? event.mcpResult.isError
            : event.role === "tool"
              ? false
              : undefined,
          event.messageId,
          event.mcpResult,
          event.metadata,
        );
        this.emit();
        break;
      }
      case "ACTIVITY_SNAPSHOT": {
        if (event.activityType === A2UI_SURFACE_ACTIVITY_TYPE) {
          this.handleA2uiActivitySnapshot(event);
          break;
        }
        if (event.activityType !== MCP_APPS_ACTIVITY_TYPE) {
          this.handleActivitySnapshot(event);
          break;
        }
        const activityScope = this.scopeOf(event);
        const toolCallId = event.content.toolCallId;
        const fallbackId =
          this.buf.lastResolvedToolCallIdByScope.get(activityScope);
        const entry =
          typeof toolCallId === "string"
            ? this.buf.toolCalls.get(toolCallId)
            : fallbackId
              ? this.buf.toolCalls.get(fallbackId)
              : undefined;
        const resourceUri = event.content.resourceUri;
        if (
          entry &&
          typeof resourceUri === "string" &&
          isMcpAppUri(resourceUri)
        ) {
          entry.mcpAppResourceUri = resourceUri;
          const id = event.content.serverId;
          const hash = event.content.serverHash;
          if (typeof id === "string" && id.length > 0) {
            entry.mcpAppServerId = id;
          } else if (typeof hash === "string" && hash.length > 0) {
            entry.mcpAppServerId = hash;
          }
          const result = event.content.result;
          if (isPlainObject(result)) {
            if (
              entry.result !== undefined &&
              entry.modelContent === undefined
            ) {
              entry.modelContent = [
                {
                  type: "text",
                  text:
                    typeof entry.result === "string"
                      ? entry.result
                      : JSON.stringify(entry.result),
                },
              ];
            }
            entry.result = result;
            entry.snapshotResultApplied = true;
            if (typeof result.isError === "boolean") {
              entry.isError = result.isError;
            }
          }
          this.emit();
        }
        break;
      }

      case "SUBAGENT_STARTED": {
        // A suspended subagent is re-announced with the same id on resume, so
        // a repeat is a continuation: it may refresh the descriptive fields
        // and reopen the status, but re-parenting an established run would
        // move its already-rendered output to a different tool call.
        const existing = this.buf.subagentRuns.get(event.subagentRunId);
        if (existing) {
          existing.name = event.name;
          if (event.description !== undefined)
            existing.description = event.description;
          existing.status = { type: "running" };
          this.emit();
          break;
        }
        this.buf.nestingMemo = undefined;
        this.buf.subagentRuns.set(event.subagentRunId, {
          subagentRunId: event.subagentRunId,
          name: event.name,
          ...(event.description !== undefined
            ? { description: event.description }
            : {}),
          ...(event.parentSubagentRunId !== undefined
            ? { parentSubagentRunId: event.parentSubagentRunId }
            : {}),
          ...(event.parentToolCallId !== undefined
            ? { parentToolCallId: event.parentToolCallId }
            : {}),
          ...(event.parentMessageId !== undefined
            ? { parentMessageId: event.parentMessageId }
            : {}),
          createdAt: new Date(),
          status: { type: "running" },
        });
        this.emit();
        break;
      }
      case "SUBAGENT_FINISHED": {
        const run = this.buf.subagentRuns.get(event.subagentRunId);
        if (run) {
          run.status =
            event.outcome?.type === "suspended"
              ? { type: "requires-action", reason: "interrupt" }
              : { type: "complete", reason: "unknown" };
          if (event.result !== undefined) run.result = event.result;
          if (event.outcome?.type === "suspended" && event.outcome.interruptIds)
            run.interruptIds = event.outcome.interruptIds;
        }
        this.emit();
        break;
      }
      case "SUBAGENT_ERROR": {
        const run = this.buf.subagentRuns.get(event.subagentRunId);
        if (run) {
          run.status = {
            type: "incomplete",
            reason: "error",
            ...(event.message !== undefined ? { error: event.message } : {}),
          };
          if (event.code !== undefined) run.errorCode = event.code;
        }
        this.emit();
        break;
      }

      case "ACTIVITY_DELTA": {
        this.handleActivityDelta(event);
        break;
      }

      default: {
        this.logger.debug?.("[agui] aggregator ignored event", event);
      }
    }
  }

  private handleActivityDelta(
    event: Extract<AgUiEvent, { type: "ACTIVITY_DELTA" }>,
  ): void {
    const scope = this.scopeOf(event);
    const existing = this.buf.activityParts.get(
      this.partKey(scope, `message:${event.messageId}`),
    );
    if (!existing) {
      this.logger.debug?.("[agui] activity delta has no snapshot", event);
      return;
    }
    if (event.patch.length === 0) return;
    try {
      const result = jsonpatch.applyPatch(
        existing.value,
        event.patch as Operation[],
        /* validateOperation */ true,
        /* mutateDocument */ false,
      );
      if (!isPlainObject(result.newDocument)) {
        this.logger.debug?.(
          "[agui] activity delta produced non-object content",
          event,
        );
        return;
      }
      existing.name = `agui-activity/${event.activityType}`;
      existing.value = result.newDocument;
      this.emit();
    } catch (error) {
      this.logger.error?.("[agui] failed to apply activity delta", error);
    }
  }

  private handleA2uiActivitySnapshot(
    event: Extract<AgUiEvent, { type: "ACTIVITY_SNAPSHOT" }>,
  ): void {
    const operations = event.content["a2ui_operations"];
    if (!Array.isArray(operations)) return;

    const messageId = event.messageId ?? "a2ui:anonymous";
    if (event.replace === false && this.buf.a2uiBuckets.has(messageId)) return;

    const { state, warnings } = applyA2uiOperations(new Map(), operations);
    for (const warning of warnings) {
      this.logger.debug("[agui] a2ui operation warning", warning);
    }
    this.buf.a2uiBuckets.delete(messageId);
    this.buf.a2uiBuckets.set(messageId, state);
    this.synthesizeA2uiToolCalls();
    this.emit();
  }

  private handleActivitySnapshot(
    event: Extract<AgUiEvent, { type: "ACTIVITY_SNAPSHOT" }>,
  ): void {
    const scope = this.scopeOf(event);
    const key = this.partKey(
      scope,
      event.messageId !== undefined
        ? `message:${event.messageId}`
        : `type:${event.activityType}`,
    );
    const existing = this.buf.activityParts.get(key);
    if (existing) {
      if (event.replace === false) return;
      existing.name = `agui-activity/${event.activityType}`;
      existing.value = event.content;
    } else {
      const part =
        scope === ROOT_SCOPE
          ? {
              kind: "data" as const,
              name: `agui-activity/${event.activityType}`,
              value: event.content,
            }
          : {
              kind: "data" as const,
              name: `agui-activity/${event.activityType}`,
              value: event.content,
              subagentRunId: scope,
            };
      this.buf.activityParts.set(key, part);
      this.buf.partOrder.push(part);
      this.buf.activeTextMessageIdByScope.delete(scope);
    }
    this.emit();
  }

  private synthesizeA2uiToolCalls(): void {
    const surfaces = new Map<string, A2uiSurfaceState>();

    for (const bucket of this.buf.a2uiBuckets.values()) {
      for (const [surfaceId, surface] of bucket) {
        surfaces.set(surfaceId, surface);
      }
    }

    const activeToolCallIds = new Set<string>();
    for (const [surfaceId, surface] of surfaces) {
      const { toolCall, warnings } = surfaceToPresentToolCall(
        surfaceId,
        surface,
      );
      for (const warning of warnings) {
        this.logger.debug("[agui] a2ui surface conversion warning", warning);
      }
      if (!toolCall) continue;

      const { toolCallId } = toolCall;

      activeToolCallIds.add(toolCallId);

      const entry: ToolCallState = {
        toolCallId: toolCall.toolCallId,
        toolCallName: toolCall.toolName,
        argsText: toolCall.argsText,
        parsedArgs: toolCall.args,
        result: toolCall.result,
        isError: undefined,
        artifact: toolCall.artifact,
        snapshotResultApplied: false,
      };
      if (!this.buf.toolCalls.has(toolCallId)) {
        this.buf.partOrder.push({ kind: "tool-call", toolCallId });
      }
      this.buf.nestingMemo = undefined;
      this.buf.toolCalls.set(toolCallId, entry);
      this.buf.a2uiToolCallIds.add(toolCallId);
    }

    for (const toolCallId of this.buf.a2uiToolCallIds) {
      if (activeToolCallIds.has(toolCallId)) continue;
      this.buf.nestingMemo = undefined;
      this.buf.toolCalls.delete(toolCallId);
      const partIndex = this.buf.partOrder.findIndex(
        (part) => part.kind === "tool-call" && part.toolCallId === toolCallId,
      );
      if (partIndex !== -1) this.buf.partOrder.splice(partIndex, 1);
      this.buf.a2uiToolCallIds.delete(toolCallId);
    }
  }

  private reportServerMessageId(messageId: string | undefined): void {
    if (!messageId) return;
    if (this.lastTextMessageId === undefined) {
      this.lastTextMessageId = messageId;
    }
    if (this.serverMessageIdReported) return;
    this.serverMessageIdReported = true;
    this.buf.reportedServerMessageId = messageId;
    this.onServerMessageId?.(messageId);
  }

  // A subagent only ever reports its own terminal, so a run that ends while
  // one is still streaming would leave that nested message spinning forever.
  // Moved-off messages publish first, so the current emit that follows sees
  // them settled.
  private closeOpenSubagentRuns(status: MessageStatus): void {
    for (const buffer of this.buffers()) {
      let closed = false;
      for (const run of buffer.subagentRuns.values()) {
        if (run.status.type !== "running") continue;
        run.status = status;
        closed = true;
      }
      if (closed && buffer !== this.current)
        this.withBuffer(buffer, () => this.emit());
    }
  }

  private scopeOf(event: { subagentRunId?: string }): string {
    return event.subagentRunId ?? ROOT_SCOPE;
  }

  // Nothing in the AG-UI schema makes a messageId unique across subagent runs,
  // so the accumulators key on the scope too. Root keys stay bare, which is
  // what the wire-id collision checks against reported message ids compare on.
  private partKey(scope: string, id: string): string {
    return scope === ROOT_SCOPE ? id : `${scope}\u0000${id}`;
  }

  private beginDistinctTextMessage(
    messageId: string | undefined,
    preserveSnapshotText = false,
  ): void {
    if (
      this.joinStrategy === "concat-content" ||
      !messageId ||
      this.lastTextMessageId === undefined ||
      this.lastTextMessageId === messageId ||
      !this.onTextMessageStart
    ) {
      return;
    }
    const carried = this.takeTrailingReasoning();
    if (carried.parts.length > 0 || carried.hiddenSignatures.length > 0) {
      this.emit();
    }
    const openToolCallIds = Array.from(this.buf.toolCalls.values())
      .filter((call) => call.result === undefined)
      .map((call) => call.toolCallId);
    if (!preserveSnapshotText) this.pendingSnapshotText.delete(messageId);
    const outgoingId =
      this.onTextMessageStart(messageId, openToolCallIds) || undefined;
    this.openMessage(messageId, outgoingId);
    this.restoreReasoning(carried);
  }

  private takeTrailingReasoning() {
    const parts: {
      key: string;
      entry: { buffer: string; timing?: MessagePartTiming };
      signature: string | undefined;
      signatureId: string | undefined;
      reasoningId: string | undefined;
    }[] = [];
    let last = this.buf.partOrder.at(-1);
    while (
      last?.kind === "reasoning" &&
      last.subagentRunId === undefined &&
      last !== this.buf.lastReasoningBeforeToolCall
    ) {
      this.buf.partOrder.pop();
      parts.unshift({
        key: last.key,
        entry: this.buf.reasoningParts.get(last.key) ?? { buffer: "" },
        signature: this.buf.reasoningSignatures.get(last.key),
        signatureId: this.buf.reasoningSignatureIds.get(last.key),
        reasoningId: this.buf.reasoningMessageIds.get(last.key),
      });
      last = this.buf.partOrder.at(-1);
    }
    const cut = this.buf.partOrder.length;
    const hiddenSignatures = Array.from(this.buf.hiddenSignatures).filter(
      ([id]) => this.buf.hiddenSignatureAnchors.get(id)! >= cut,
    );
    for (const [id] of hiddenSignatures) {
      this.buf.hiddenSignatures.delete(id);
      this.buf.hiddenSignatureAnchors.delete(id);
    }
    const hiddenBlockIds = Array.from(this.buf.hiddenBlockAnchors)
      .filter(([, anchor]) => anchor >= cut)
      .map(([id]) => id);
    const hiddenActiveReasoningId = this.buf.hiddenActiveReasoningId;
    return {
      parts,
      activeKey: this.buf.activeReasoningKeyByScope.get(ROOT_SCOPE),
      hiddenSignatures,
      hiddenBlockIds,
      hiddenActiveReasoningId:
        hiddenActiveReasoningId !== undefined &&
        hiddenBlockIds.includes(hiddenActiveReasoningId)
          ? hiddenActiveReasoningId
          : undefined,
    };
  }

  private restoreReasoning(
    carried: ReturnType<RunAggregator["takeTrailingReasoning"]>,
  ): void {
    for (const part of carried.parts) {
      this.buf.partOrder.push({ kind: "reasoning", key: part.key });
      this.buf.reasoningParts.set(part.key, part.entry);
      if (part.signature !== undefined)
        this.buf.reasoningSignatures.set(part.key, part.signature);
      if (part.signatureId !== undefined)
        this.buf.reasoningSignatureIds.set(part.key, part.signatureId);
      if (part.reasoningId !== undefined)
        this.buf.reasoningMessageIds.set(part.key, part.reasoningId);
    }
    if (
      carried.activeKey !== undefined &&
      this.buf.reasoningParts.has(carried.activeKey)
    ) {
      this.buf.activeReasoningKeyByScope.set(ROOT_SCOPE, carried.activeKey);
    }
    for (const [id, encryptedValue] of carried.hiddenSignatures) {
      this.buf.hiddenSignatures.set(id, encryptedValue);
      this.buf.hiddenSignatureAnchors.set(id, 0);
    }
    for (const id of carried.hiddenBlockIds) {
      this.buf.hiddenReasoningIds.add(id);
      this.buf.hiddenBlockAnchors.set(id, 0);
    }
    this.buf.hiddenActiveReasoningId = carried.hiddenActiveReasoningId;
  }

  private generateTextKey(): string {
    this.buf.textPartCounter += 1;
    return `text-${this.buf.textPartCounter}`;
  }

  private startTextMessage(scope: string, messageId?: string): string {
    const id = messageId ?? this.generateTextKey();
    const key = this.ensureTextPart(scope, id);
    if (scope === ROOT_SCOPE && messageId) {
      const snapshotText = this.pendingSnapshotText.get(messageId);
      const part = this.buf.textParts.get(key);
      if (snapshotText !== undefined && part) {
        part.buffer = snapshotText;
        this.pendingSnapshotText.delete(messageId);
      }
    }
    this.buf.activeTextMessageIdByScope.set(scope, key);
    return key;
  }

  private resolveTextMessageId(scope: string, messageId?: string): string {
    if (messageId) {
      return this.startTextMessage(scope, messageId);
    }

    const active = this.buf.activeTextMessageIdByScope.get(scope);
    if (active) {
      return active;
    }

    const key = this.ensureTextPart(scope, this.generateTextKey());
    this.buf.activeTextMessageIdByScope.set(scope, key);
    return key;
  }

  private ensureTextPart(scope: string, id: string): string {
    const key = this.partKey(scope, id);
    if (!this.buf.textParts.has(key)) {
      this.buf.textParts.set(key, { buffer: "" });
      if (
        !this.buf.partOrder.some(
          (part) => part.kind === "text" && part.key === key,
        )
      ) {
        this.buf.partOrder.push(
          scope === ROOT_SCOPE
            ? { kind: "text", key }
            : { kind: "text", key, subagentRunId: scope },
        );
      }
    }
    return key;
  }

  private appendText(id: string, delta: string): void {
    const entry = this.buf.textParts.get(id);
    if (!entry) return;
    entry.buffer += delta;
  }

  private startToolCall(
    scope: string,
    id: string | undefined,
    name?: string,
    parentMessageId?: string,
  ) {
    if (!id) return;
    // A new tool call acts as a boundary: any anonymous text that arrives
    // after it should be a new part, not appended to the pre-tool text —
    // scoped, so a subagent's tool call doesn't break the root run's text
    // and vice versa.
    this.buf.activeTextMessageIdByScope.delete(scope);
    if (
      !this.buf.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      // Tool insertion can precede existing reasoning in display order.
      if (scope === ROOT_SCOPE) {
        this.buf.lastReasoningBeforeToolCall = this.buf.partOrder.findLast(
          (part) =>
            part.kind === "reasoning" && part.subagentRunId === undefined,
        );
      }
      this.insertToolPart(scope, id, parentMessageId);
    }
    const state: ToolCallState = {
      toolCallId: id,
      toolCallName: name ?? "tool",
      argsText: "",
      parsedArgs: undefined,
      result: undefined,
      isError: undefined,
      snapshotResultApplied: false,
    };
    if (parentMessageId) {
      state.parentMessageId = parentMessageId;
    }
    if (scope !== ROOT_SCOPE) {
      state.subagentRunId = scope;
    }
    this.buf.nestingMemo = undefined;
    this.buf.toolCalls.set(id, state);
  }

  // The message and tool-call channels are unordered on the wire, so anchor a
  // tool call under its parentMessageId text part instead of appending it.
  private insertToolPart(scope: string, id: string, parentMessageId?: string) {
    const entry = { kind: "tool-call", toolCallId: id } as const;
    if (parentMessageId) {
      const parentKey = this.partKey(scope, parentMessageId);
      const parentIndex = this.buf.partOrder.findIndex(
        (part) => part.kind === "text" && part.key === parentKey,
      );
      if (parentIndex !== -1) {
        let insertAt = parentIndex + 1;
        while (insertAt < this.buf.partOrder.length) {
          const part = this.buf.partOrder[insertAt];
          if (
            part?.kind === "tool-call" &&
            this.buf.toolCalls.get(part.toolCallId)?.parentMessageId ===
              parentMessageId
          ) {
            insertAt += 1;
            continue;
          }
          break;
        }
        this.buf.partOrder.splice(insertAt, 0, entry);
        return;
      }
    }
    this.buf.partOrder.push(entry);
  }

  private appendToolArgs(id: string | undefined, delta: string) {
    const entry = id ? this.buf.toolCalls.get(id) : undefined;
    if (!entry) return;
    if (!entry.argsTextScanner) {
      entry.argsTextScanner = createJSONContainerScanner();
    }
    entry.argsText += delta;
    const shouldParse = scanJSONContainerDelta(entry.argsTextScanner, delta);
    if (!shouldParse) {
      if (entry.argsTextScanner.state === "invalid") {
        entry.parsedArgs = undefined;
      }
      return;
    }
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
    scope: string,
    id: string,
    content: string | ContentPart[],
    isError?: boolean,
    toolMessageId?: string,
    mcpResult?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ) {
    if (!id) return;
    const modelText = toolContentText(content);
    let entry = this.buf.toolCalls.get(id);
    if (!entry) {
      entry = {
        toolCallId: id,
        toolCallName: "tool",
        argsText: "",
        parsedArgs: undefined,
        result: undefined,
        isError: undefined,
        snapshotResultApplied: false,
        ...(scope !== ROOT_SCOPE ? { subagentRunId: scope } : {}),
      };
      this.buf.nestingMemo = undefined;
      this.buf.toolCalls.set(id, entry);
    }
    if (
      !this.buf.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      this.buf.partOrder.push({ kind: "tool-call", toolCallId: id });
    }
    if (mcpResult !== undefined && !entry.snapshotResultApplied) {
      entry.result = mcpResult;
      entry.modelContent = [{ type: "text", text: modelText }];
      entry.snapshotResultApplied = true;
      entry.isError = isError;
      if (entry.mcpAppResourceUri === undefined) {
        const uri = readMcpAppResourceUri(mcpResult._meta);
        if (uri !== undefined) entry.mcpAppResourceUri = uri;
      }
    } else if (entry.snapshotResultApplied) {
      if (entry.modelContent === undefined) {
        entry.modelContent = [{ type: "text", text: modelText }];
      }
      if (entry.isError === undefined) {
        entry.isError = isError;
      }
    } else {
      entry.result = Array.isArray(content) ? content : tryParseJSON(content);
      if (Array.isArray(content)) {
        delete entry.modelContent;
      }
      entry.isError = isError;
    }
    if (toolMessageId) {
      entry.toolMessageId = toolMessageId;
    }
    if (metadata !== undefined) {
      entry.resultMetadata = { ...entry.resultMetadata, ...metadata };
    }
    this.buf.lastResolvedToolCallIdByScope.set(scope, id);
  }

  private nesting(): {
    subagentsByParentToolCallId: Map<string, string[]>;
    reachable: Set<string>;
  } {
    if (!this.buf.nestingMemo) {
      const subagentsByParentToolCallId = this.subagentsByParentToolCallId();
      this.buf.nestingMemo = {
        subagentsByParentToolCallId,
        reachable: this.reachableSubagentRunIds(subagentsByParentToolCallId),
      };
    }
    return this.buf.nestingMemo;
  }

  private subagentsByParentToolCallId(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const run of this.buf.subagentRuns.values()) {
      if (!run.parentToolCallId) continue;
      const list = map.get(run.parentToolCallId) ?? [];
      list.push(run.subagentRunId);
      map.set(run.parentToolCallId, list);
    }
    return map;
  }

  // A subagent nests under its spawning tool call only when that call is itself
  // reachable from the root scope. A run with no parentToolCallId, one naming a
  // call this run never saw, or one in a cycle has nowhere to hang; the visited
  // set also keeps a malformed chain to one visit per run instead of branching
  // at every level.
  private reachableSubagentRunIds(
    subagentsByParentToolCallId: Map<string, string[]>,
  ): Set<string> {
    const reachable = new Set<string>();
    const walk = (scope: string, depth: number): void => {
      if (depth > MAX_SUBAGENT_DEPTH) return;
      for (const entry of this.buf.toolCalls.values()) {
        if ((entry.subagentRunId ?? ROOT_SCOPE) !== scope) continue;
        for (const id of subagentsByParentToolCallId.get(entry.toolCallId) ??
          []) {
          if (reachable.has(id)) continue;
          reachable.add(id);
          walk(id, depth + 1);
        }
      }
    };
    walk(ROOT_SCOPE, 0);
    return reachable;
  }

  // Nested messages rather than a discovery hook (the shape react-langchain
  // uses): ToolCallMessagePart.messages is the contract core consumers already
  // walk, and SUBAGENT_STARTED.parentToolCallId names the spawning call
  // outright, so the join needs no namespace scheme of its own.
  private materializeSubagentMessage(
    subagentRunId: string,
    depth: number,
    ctx: BuildContext,
  ): ThreadMessage | undefined {
    const run = this.buf.subagentRuns.get(subagentRunId);
    if (!run || depth > MAX_SUBAGENT_DEPTH) return undefined;
    const content = this.buildParts(subagentRunId, depth + 1, ctx);
    return {
      id: run.subagentRunId,
      role: "assistant",
      createdAt: run.createdAt,
      status: run.status,
      content,
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {
          [AG_UI_METADATA_NAMESPACE]: {
            name: run.name,
            ...(run.description !== undefined
              ? { description: run.description }
              : {}),
            ...(run.parentSubagentRunId !== undefined
              ? { parentSubagentRunId: run.parentSubagentRunId }
              : {}),
            ...(run.result !== undefined ? { result: run.result } : {}),
            ...(run.interruptIds !== undefined
              ? { interruptIds: run.interruptIds }
              : {}),
            ...(run.errorCode !== undefined
              ? { errorCode: run.errorCode }
              : {}),
          },
        },
      },
    } as ThreadMessage;
  }

  private buildParts(
    scope: string,
    depth: number,
    ctx: BuildContext,
  ): ThreadAssistantMessagePart[] {
    const snapshot: ThreadAssistantMessagePart[] = [];
    const isRoot = scope === ROOT_SCOPE;

    for (const { index, part } of ctx.partsByScope.get(scope) ?? []) {
      const materialized = () => {
        if (isRoot && ctx.root) ctx.root.lastMaterializedIndex = index;
      };

      if (part.kind === "tool-call") {
        const entry = this.buf.toolCalls.get(part.toolCallId);
        if (!entry) continue;
        const approval = ctx.approvals.get(entry.toolCallId);
        const nestedMessages = (
          ctx.subagentsByParentToolCallId.get(entry.toolCallId) ?? []
        )
          .filter((id) => ctx.reachable.has(id))
          .map((id) => this.materializeSubagentMessage(id, depth, ctx))
          .filter((m): m is ThreadMessage => m !== undefined);
        const toolPart: ToolCallMessagePart = {
          type: "tool-call",
          toolCallId: entry.toolCallId,
          toolName: entry.toolCallName,
          args: (entry.parsedArgs ?? {}) as any,
          argsText: entry.argsText,
          ...(approval ? { approval } : {}),
          ...(entry.result !== undefined ? { result: entry.result } : {}),
          ...(entry.artifact !== undefined ? { artifact: entry.artifact } : {}),
          ...(entry.modelContent !== undefined
            ? { modelContent: entry.modelContent }
            : {}),
          ...(entry.isError !== undefined ? { isError: entry.isError } : {}),
          ...(entry.mcpAppResourceUri
            ? {
                mcp: {
                  app: {
                    resourceUri: entry.mcpAppResourceUri,
                    ...(entry.mcpAppServerId
                      ? { serverId: entry.mcpAppServerId }
                      : {}),
                  },
                },
              }
            : {}),
          ...(entry.parentMessageId ? { parentId: entry.parentMessageId } : {}),
          ...(entry.toolMessageId
            ? { unstable_toolMessageId: entry.toolMessageId }
            : {}),
          ...(entry.resultMetadata !== undefined
            ? {
                providerMetadata: withAgUiPartMessageMetadata(
                  undefined,
                  entry.resultMetadata,
                ),
              }
            : {}),
          ...(nestedMessages.length > 0 ? { messages: nestedMessages } : {}),
        } as ToolCallMessagePart & { unstable_toolMessageId?: string };
        snapshot.push(toolPart);
        materialized();
        continue;
      }

      const rawScope =
        "subagentRunId" in part
          ? (part.subagentRunId ?? ROOT_SCOPE)
          : ROOT_SCOPE;

      if (part.kind === "reasoning") {
        if (this.showThinking) {
          const entry = this.buf.reasoningParts.get(part.key);
          const buffer = entry?.buffer ?? "";
          const isActive =
            this.buf.activeReasoningKeyByScope.get(rawScope) === part.key;
          if (buffer.length > 0 || isActive) {
            const encryptedValue = this.buf.reasoningSignatures.get(part.key);
            const reasoningId = this.buf.reasoningMessageIds.get(part.key);
            const meta = {
              ...(reasoningId !== undefined ? { reasoningId } : {}),
              ...(encryptedValue !== undefined ? { encryptedValue } : {}),
            };
            snapshot.push({
              type: "reasoning",
              text: buffer,
              ...(entry?.timing ? { timing: entry.timing } : {}),
              ...(Object.keys(meta).length > 0
                ? { providerMetadata: { [AG_UI_METADATA_NAMESPACE]: meta } }
                : {}),
            } as const);
            materialized();
          } else if (isRoot && ctx.root) {
            // A retracted empty block still carries transport state: without
            // a part to live on, its signature rides the message metadata,
            // matching the shape a snapshot reload produces.
            const encryptedValue = this.buf.reasoningSignatures.get(part.key);
            const id = this.buf.reasoningSignatureIds.get(part.key);
            if (id?.trim() && encryptedValue?.trim()) {
              ctx.root.opaqueCandidates.push({
                id,
                encryptedValue,
                anchor: index + 1,
              });
            }
          }
        }
        continue;
      }

      if (part.kind === "text") {
        const entry = this.buf.textParts.get(part.key);
        if (entry && entry.buffer.trim().length > 0) {
          snapshot.push({ type: "text", text: entry.buffer } as const);
          materialized();
        }
        continue;
      }

      if (part.kind === "data") {
        snapshot.push({
          type: "data",
          name: part.name,
          data: part.value,
        });
        materialized();
        continue;
      }
    }

    return snapshot;
  }

  private emit(): void {
    const { subagentsByParentToolCallId, reachable } = this.nesting();
    const root = {
      opaqueCandidates: Array.from(
        this.buf.hiddenSignatures,
        ([id, encryptedValue]) => ({
          id,
          encryptedValue,
          anchor: this.buf.hiddenSignatureAnchors.get(id)!,
        }),
      ) as (AgUiOpaqueReasoning & { anchor: number })[],
      lastMaterializedIndex: -1,
    };
    // A run that ended incomplete can no longer be resumed, so a gate left over
    // from an earlier interrupt outcome is unanswerable and must not stay
    // projected. The interrupts themselves are kept on the message, since the
    // bespoke hooks read that payload. Bound ids cover every call the run
    // produced, root or nested: the approval seams walk
    // ToolCallMessagePart.messages, so a gate naming a subagent-scoped call is
    // answerable and projects onto the nested part.
    const partsByScope = new Map<
      string,
      { index: number; part: PartOrderEntry }[]
    >();
    for (const [index, part] of this.buf.partOrder.entries()) {
      const rawScope =
        part.kind === "tool-call"
          ? (this.buf.toolCalls.get(part.toolCallId)?.subagentRunId ??
            ROOT_SCOPE)
          : "subagentRunId" in part
            ? (part.subagentRunId ?? ROOT_SCOPE)
            : ROOT_SCOPE;
      const bucketScope =
        rawScope === ROOT_SCOPE || reachable.has(rawScope)
          ? rawScope
          : ROOT_SCOPE;
      const bucket = partsByScope.get(bucketScope);
      if (bucket) bucket.push({ index, part });
      else partsByScope.set(bucketScope, [{ index, part }]);
    }
    const ctx: BuildContext = {
      subagentsByParentToolCallId,
      reachable,
      partsByScope,
      approvals: projectAgUiToolApprovals(
        this.buf === this.current && this.status?.type === "requires-action"
          ? this.interrupts
          : undefined,
        new Set(
          Array.from(this.buf.toolCalls.values()).map(
            (entry) => entry.toolCallId,
          ),
        ),
      ),
      root,
    };
    const snapshot = this.buildParts(ROOT_SCOPE, 0, ctx);
    const { opaqueCandidates, lastMaterializedIndex } = root;

    const toolMessageIds = new Set<string>();
    for (const call of this.buf.toolCalls.values()) {
      if (call.toolMessageId) toolMessageIds.add(call.toolMessageId);
    }
    opaqueCandidates.sort((a, b) => a.anchor - b.anchor);
    const publishableOpaqueReasoning = opaqueCandidates
      .filter((entry) => {
        const collides =
          this.buf.textParts.has(entry.id) ||
          entry.id === this.buf.reportedServerMessageId ||
          toolMessageIds.has(entry.id);
        if (collides && !this.buf.loggedDroppedOpaqueIds.has(entry.id)) {
          this.buf.loggedDroppedOpaqueIds.add(entry.id);
          this.logger.debug?.(
            "[agui] aggregator dropped opaque reasoning signature: id collides with a message id",
            entry.id,
          );
        }
        return !collides;
      })
      .map(({ anchor, ...entry }) =>
        lastMaterializedIndex < anchor ? { ...entry, after: true } : entry,
      );
    if (publishableOpaqueReasoning.length > 0)
      this.buf.hasEmittedOpaqueReasoning = true;
    // Once an opaque entry has been published this run, the key keeps being
    // emitted (empty when withdrawn) so the namespace merge can retract it.
    const includeOpaque = this.buf.hasEmittedOpaqueReasoning;
    if (this.buf !== this.current) {
      this.onRetainedMessage?.(
        {
          content: snapshot,
          ...(includeOpaque
            ? {
                metadata: {
                  custom: {
                    [AG_UI_METADATA_NAMESPACE]: {
                      opaqueReasoning: publishableOpaqueReasoning,
                    } satisfies AgUiCustomMetadata,
                  },
                },
              }
            : {}),
        },
        this.retainedState(this.buf),
      );
      return;
    }
    const timing = this.getTiming();
    const metadata = {
      ...(timing ? { timing } : {}),
      ...(this.interrupts ||
      (this.status?.type === "requires-action" &&
        this.status.reason === "tool-calls" &&
        this.pendingToolCallIds) ||
      includeOpaque
        ? {
            custom: {
              [AG_UI_METADATA_NAMESPACE]: {
                ...(this.interrupts ? { interrupts: this.interrupts } : {}),
                ...(this.status?.type === "requires-action" &&
                this.status.reason === "tool-calls" &&
                this.pendingToolCallIds
                  ? { pendingToolCallIds: this.pendingToolCallIds }
                  : {}),
                ...(includeOpaque
                  ? { opaqueReasoning: publishableOpaqueReasoning }
                  : {}),
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
            Array.from(this.buf.textParts.values()).reduce(
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
      toolCallCount: this.buf.toolCalls.size,
    };
  }

  private handleReasoningStart(
    scope: string,
    messageId: string,
    isMessageId = false,
    timestamp?: number,
  ): void {
    if (!this.showThinking) {
      if (scope !== ROOT_SCOPE) return;
      const anchor = this.buf.partOrder.length;
      this.buf.hiddenReasoningIds.add(messageId);
      this.buf.hiddenBlockAnchors.set(messageId, anchor);
      this.buf.hiddenActiveReasoningId = messageId;
      return;
    }
    // A reasoning block acts as a boundary: anonymous text arriving after it
    // should be a new part, not appended to any pre-reasoning text — scoped.
    this.buf.activeTextMessageIdByScope.delete(scope);
    const key = this.partKey(scope, messageId);
    if (isMessageId) {
      this.buf.reasoningMessageIds.set(key, messageId);
    }
    if (!this.buf.reasoningParts.has(key)) {
      this.buf.reasoningParts.set(key, { buffer: "" });
      this.buf.partOrder.push(
        scope === ROOT_SCOPE
          ? { kind: "reasoning", key }
          : { kind: "reasoning", key, subagentRunId: scope },
      );
    }
    const entry = this.buf.reasoningParts.get(key);
    if (entry?.timing) {
      entry.timing = { startedAt: entry.timing.startedAt };
    } else if (
      entry &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp)
    ) {
      entry.timing = { startedAt: timestamp };
    }
    this.buf.activeReasoningKeyByScope.set(scope, key);
    this.emit();
  }

  private handleReasoningContent(
    scope: string,
    delta: string,
    messageId: string,
    isMessageId = false,
  ): void {
    if (!delta) return;
    if (!this.showThinking) {
      // Content without a preceding START still names the block (the visible
      // path opens it lazily); register it so a signature can claim it.
      if (scope !== ROOT_SCOPE) return;
      if (this.buf.hiddenActiveReasoningId === undefined) {
        this.handleReasoningStart(scope, messageId, isMessageId);
      }
      return;
    }
    if (!this.buf.activeReasoningKeyByScope.has(scope)) {
      // Content arrived without a preceding START — create the slot lazily.
      this.handleReasoningStart(scope, messageId, isMessageId);
    }
    const key = this.buf.activeReasoningKeyByScope.get(scope);
    if (!key) return;
    const entry = this.buf.reasoningParts.get(key);
    if (entry) entry.buffer += delta;
    this.emit();
  }

  private handleReasoningEnd(scope: string, timestamp?: number): void {
    if (!this.showThinking) {
      if (scope === ROOT_SCOPE) this.buf.hiddenActiveReasoningId = undefined;
      return;
    }
    const key = this.buf.activeReasoningKeyByScope.get(scope);
    const entry = key ? this.buf.reasoningParts.get(key) : undefined;
    if (
      entry?.timing &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp)
    ) {
      entry.timing = { ...entry.timing, completedAt: timestamp };
    }
    this.buf.activeReasoningKeyByScope.delete(scope);
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
