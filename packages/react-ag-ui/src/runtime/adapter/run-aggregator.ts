"use client";

import {
  isMcpAppUri,
  type ChatModelRunResult,
  type MessageStatus,
  type MessageTiming,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePart,
  type ToolModelContentPart,
} from "@assistant-ui/core";
import {
  applyA2uiOperations,
  convertSurfaceToUISpec,
  type A2uiState,
  type A2uiSurfaceState,
} from "@assistant-ui/react-generative-ui/a2ui";
import { readMcpAppResourceUri } from "../mcp-tool-result";
import { projectAgUiToolApprovals } from "./tool-approval";
import type { AgUiEvent, AgUiInterrupt } from "../types";
import type { Logger } from "../logger";

export const AG_UI_METADATA_NAMESPACE = "agui";

const ROOT_SCOPE = "";

// Defensive guard against a malformed or cyclic parentToolCallId /
// parentSubagentRunId chain, not a realistic nesting depth.
const MAX_SUBAGENT_DEPTH = 16;

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
  | { kind: "data"; name: string; value: unknown };

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

export type AgUiOpaqueReasoning = {
  id: string;
  encryptedValue: string;
  after?: boolean;
};

export type AgUiCustomMetadata = {
  /** Wire role restored on export for messages the internal model cannot
   * represent (a developer record rides as a system message). */
  role?: "developer";
  interrupts?: AgUiInterrupt[];
  opaqueReasoning?: AgUiOpaqueReasoning[];
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
  mcpAppServerId?: string;
  modelContent?: ToolModelContentPart[];
  snapshotResultApplied: boolean;
  subagentRunId?: string;
};

export const MCP_APPS_ACTIVITY_TYPE = "mcp-apps";

export const A2UI_SURFACE_ACTIVITY_TYPE = "a2ui-surface";

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export type RunAggregatorOptions = {
  showThinking: boolean;
  logger: Logger;
  emit: Emit;
  onServerMessageId?: (messageId: string) => void;
  onTextMessageStart?: (messageId: string) => void;
};

/**
 * Collects AG-UI events into assistant-ui run snapshots that can be yielded from a ChatModelAdapter.
 *
 * The aggregator keeps a single assistant message worth of parts. Each incoming event updates the parts and
 * emits a fresh snapshot through the provided `emit` callback. `CUSTOM` events
 * become canonical data parts; integration plumbing names such as
 * `on_interrupt`, `PredictState`, `Exit`, `hook_error`, `state_update_error`,
 * `system:*`, and `MultiAgentHandoff` are forwarded the same way, so apps only
 * need data renderers for names they own.
 */
export class RunAggregator {
  private readonly emitUpdate: Emit;
  private readonly showThinking: boolean;
  private readonly logger: Logger;
  private readonly onServerMessageId: ((messageId: string) => void) | undefined;
  private readonly onTextMessageStart:
    | ((messageId: string) => void)
    | undefined;

  private status: ChatModelRunResult["status"] | undefined;
  private interrupts: AgUiInterrupt[] | undefined;
  private readonly textParts = new Map<string, { buffer: string }>();
  private readonly activeTextMessageIdByScope = new Map<string, string>();
  private readonly reasoningParts = new Map<string, string>(); // key → buffer
  private readonly reasoningSignatures = new Map<string, string>();
  private readonly reasoningSignatureIds = new Map<string, string>();
  // Signatures captured while thinking is hidden have no block to live on;
  // they are transport state that must survive to the next run input. The
  // claim rules mirror the visible path: an id-carrying block, or an open
  // anonymous one.
  private readonly hiddenSignatures = new Map<string, string>();
  private readonly hiddenSignatureAnchors = new Map<string, number>();
  private readonly hiddenBlockAnchors = new Map<string, number>();
  private hiddenAnonymousAnchor: number | undefined;
  private readonly hiddenReasoningIds = new Set<string>();
  private hiddenActiveReasoning: "none" | "anonymous" | "identified" = "none";
  private hasEmittedOpaqueReasoning = false;
  private readonly loggedDroppedOpaqueIds = new Set<string>();
  private readonly reasoningMessageIds = new Map<string, string>();
  private readonly anonymousReasoningKeys = new Set<string>();
  private readonly activeReasoningKeyByScope = new Map<string, string>();
  private readonly subagentRuns = new Map<string, SubagentRunState>();
  // The nesting graph only moves when a run is announced or a tool call is
  // created, which is rare next to emit(), so it is derived once per change
  // rather than per streamed delta.
  private nestingMemo:
    | {
        subagentsByParentToolCallId: Map<string, string[]>;
        reachable: Set<string>;
      }
    | undefined;
  private reasoningPartCounter = 0;
  private readonly toolCalls = new Map<string, ToolCallState>();
  private readonly a2uiBuckets = new Map<string, A2uiState>();
  private readonly a2uiToolCallIds = new Set<string>();
  private readonly lastResolvedToolCallIdByScope = new Map<string, string>();
  private readonly partOrder: PartOrderEntry[] = [];
  private textPartCounter = 0;
  private serverMessageIdReported = false;
  private reportedServerMessageId: string | undefined;
  private lastTextMessageId: string | undefined;

  private streamStartTime: number | undefined;
  private firstTokenTime: number | undefined;
  private totalChunks = 0;

  constructor(options: RunAggregatorOptions) {
    this.emitUpdate = options.emit;
    this.showThinking = options.showThinking;
    this.logger = options.logger;
    this.onServerMessageId = options.onServerMessageId;
    this.onTextMessageStart = options.onTextMessageStart;
  }

  hasToolCall(toolCallId: string): boolean {
    return this.toolCalls.has(toolCallId);
  }

  handle(event: AgUiEvent): void {
    switch (event.type) {
      case "RUN_STARTED": {
        this.resetMessageParts();
        this.interrupts = undefined;
        this.serverMessageIdReported = false;
        this.lastTextMessageId = undefined;
        this.reportedServerMessageId = undefined;
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
        const { reachable } = this.nesting();
        // Classified by the scope a call actually renders in: one flattened to
        // root is reachable by getPendingToolCalls and therefore answerable,
        // while one nested inside a subagent message is not.
        const unresolved = Array.from(this.toolCalls.values()).filter(
          (tc) => tc.result === undefined,
        );
        const hasUnresolvedRootToolCalls = unresolved.some(
          (tc) =>
            tc.subagentRunId === undefined || !reachable.has(tc.subagentRunId),
        );
        const hasUnresolvedSubagentToolCalls = unresolved.some(
          (tc) =>
            tc.subagentRunId !== undefined && reachable.has(tc.subagentRunId),
        );

        this.status = hasUnresolvedRootToolCalls
          ? { type: "requires-action", reason: "tool-calls" }
          : hasUnresolvedSubagentToolCalls
            ? { type: "incomplete", reason: "tool-calls" }
            : { type: "complete", reason: "unknown" };
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
        this.status = { type: "incomplete", reason: "cancelled" };
        this.closeOpenSubagentRuns(this.status);
        this.emit();
        break;
      }

      case "TEXT_MESSAGE_START": {
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE) {
          this.beginDistinctTextMessage(event.messageId);
          this.reportServerMessageId(event.messageId);
          if (event.messageId) this.lastTextMessageId = event.messageId;
        }
        this.startTextMessage(scope, event.messageId);
        this.emit();
        break;
      }
      case "TEXT_MESSAGE_CONTENT":
      case "TEXT_MESSAGE_CHUNK": {
        const incomingId = "messageId" in event ? event.messageId : undefined;
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE) {
          this.beginDistinctTextMessage(incomingId);
          this.reportServerMessageId(incomingId);
          if (incomingId) this.lastTextMessageId = incomingId;
        }
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
        if (scope === ROOT_SCOPE) this.reportServerMessageId(event.messageId);
        if (
          event.messageId &&
          this.activeTextMessageIdByScope.get(scope) ===
            this.partKey(scope, event.messageId)
        ) {
          this.activeTextMessageIdByScope.delete(scope);
        }
        this.emit();
        break;
      }

      case "CUSTOM": {
        this.activeTextMessageIdByScope.delete(ROOT_SCOPE);
        this.partOrder.push({
          kind: "data",
          name: event.name,
          value: event.value,
        });
        this.emit();
        break;
      }

      case "THINKING_START":
      case "THINKING_TEXT_MESSAGE_START":
      case "REASONING_START":
      case "REASONING_MESSAGE_START":
        this.handleReasoningStart(
          this.scopeOf("subagentRunId" in event ? event : {}),
          "messageId" in event ? event.messageId : undefined,
          event.type === "REASONING_MESSAGE_START",
        );
        break;
      case "REASONING_ENCRYPTED_VALUE":
        if (event.subtype === "message") {
          const scope = this.scopeOf(event);
          // entityId names any message, not necessarily a reasoning one, so an
          // unmatched id may only claim a block that has no id to contradict it.
          const active = this.activeReasoningKeyByScope.get(scope);
          const entityKey = this.partKey(scope, event.entityId);
          const key = this.showThinking
            ? this.reasoningParts.has(entityKey)
              ? entityKey
              : active !== undefined && this.anonymousReasoningKeys.has(active)
                ? active
                : undefined
            : undefined;
          if (key !== undefined) {
            this.reasoningSignatures.set(key, event.encryptedValue);
            this.reasoningSignatureIds.set(key, event.entityId);
            this.emit();
          } else if (
            !this.showThinking &&
            // Hidden-reasoning bookkeeping stays root-only for this task — a
            // subagent's opaque/hidden reasoning signatures are not preserved.
            scope === ROOT_SCOPE &&
            event.entityId.trim().length > 0 &&
            event.encryptedValue.trim().length > 0 &&
            (this.hiddenReasoningIds.has(event.entityId) ||
              this.hiddenActiveReasoning === "anonymous")
          ) {
            this.hiddenSignatures.set(event.entityId, event.encryptedValue);
            this.hiddenSignatureAnchors.set(
              event.entityId,
              this.hiddenBlockAnchors.get(event.entityId) ??
                this.hiddenAnonymousAnchor ??
                this.partOrder.length,
            );
            this.emit();
          }
        }
        break;
      case "THINKING_TEXT_MESSAGE_CONTENT":
        this.handleReasoningContent(ROOT_SCOPE, event.delta);
        this.totalChunks++;
        this.recordFirstToken();
        break;
      case "REASONING_MESSAGE_CONTENT":
        this.handleReasoningContent(
          this.scopeOf(event),
          event.delta,
          "messageId" in event ? event.messageId : undefined,
          true,
        );
        this.totalChunks++;
        this.recordFirstToken();
        break;
      case "THINKING_TEXT_MESSAGE_END":
      case "THINKING_END":
        this.handleReasoningEnd(ROOT_SCOPE);
        break;
      case "REASONING_MESSAGE_END":
      case "REASONING_END":
        this.handleReasoningEnd(this.scopeOf(event));
        break;

      case "TOOL_CALL_START": {
        const scope = this.scopeOf(event);
        if (scope === ROOT_SCOPE) {
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
      case "TOOL_CALL_ARGS":
      case "TOOL_CALL_CHUNK": {
        if (
          event.type === "TOOL_CALL_CHUNK" &&
          this.scopeOf(event) === ROOT_SCOPE
        ) {
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
        );
        this.emit();
        break;
      }
      case "ACTIVITY_SNAPSHOT": {
        if (event.activityType === A2UI_SURFACE_ACTIVITY_TYPE) {
          this.handleA2uiActivitySnapshot(event);
          break;
        }
        if (event.activityType !== MCP_APPS_ACTIVITY_TYPE) break;
        const activityScope = this.scopeOf(event);
        const toolCallId = event.content.toolCallId;
        const fallbackId =
          this.lastResolvedToolCallIdByScope.get(activityScope);
        const entry =
          typeof toolCallId === "string"
            ? this.toolCalls.get(toolCallId)
            : fallbackId
              ? this.toolCalls.get(fallbackId)
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
        const existing = this.subagentRuns.get(event.subagentRunId);
        if (existing) {
          existing.name = event.name;
          if (event.description !== undefined)
            existing.description = event.description;
          existing.status = { type: "running" };
          this.emit();
          break;
        }
        this.nestingMemo = undefined;
        this.subagentRuns.set(event.subagentRunId, {
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
        const run = this.subagentRuns.get(event.subagentRunId);
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
        const run = this.subagentRuns.get(event.subagentRunId);
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

      default: {
        this.logger.debug?.("[agui] aggregator ignored event", event);
      }
    }
  }

  private handleA2uiActivitySnapshot(
    event: Extract<AgUiEvent, { type: "ACTIVITY_SNAPSHOT" }>,
  ): void {
    const operations = event.content["a2ui_operations"];
    if (!Array.isArray(operations)) return;

    const messageId = event.messageId ?? "a2ui:anonymous";
    if (event.replace === false && this.a2uiBuckets.has(messageId)) return;

    const { state, warnings } = applyA2uiOperations(new Map(), operations);
    for (const warning of warnings) {
      this.logger.debug("[agui] a2ui operation warning", warning);
    }
    this.a2uiBuckets.delete(messageId);
    this.a2uiBuckets.set(messageId, state);
    this.synthesizeA2uiToolCalls();
    this.emit();
  }

  private synthesizeA2uiToolCalls(): void {
    const surfaces = new Map<string, A2uiSurfaceState>();

    for (const bucket of this.a2uiBuckets.values()) {
      for (const [surfaceId, surface] of bucket) {
        surfaces.set(surfaceId, surface);
      }
    }

    const activeToolCallIds = new Set<string>();
    for (const [surfaceId, surface] of surfaces) {
      const toolCallId = `a2ui:${surfaceId}`;
      const { spec, warnings } = convertSurfaceToUISpec(surface);
      for (const warning of warnings) {
        this.logger.debug("[agui] a2ui surface conversion warning", warning);
      }
      if (!spec) continue;

      activeToolCallIds.add(toolCallId);

      const entry: ToolCallState = {
        toolCallId,
        toolCallName: "present",
        argsText: JSON.stringify(spec),
        parsedArgs: spec,
        result: {},
        isError: undefined,
        snapshotResultApplied: false,
      };
      if (!this.toolCalls.has(toolCallId)) {
        this.partOrder.push({ kind: "tool-call", toolCallId });
      }
      this.nestingMemo = undefined;
      this.toolCalls.set(toolCallId, entry);
      this.a2uiToolCallIds.add(toolCallId);
    }

    for (const toolCallId of this.a2uiToolCallIds) {
      if (activeToolCallIds.has(toolCallId)) continue;
      this.nestingMemo = undefined;
      this.toolCalls.delete(toolCallId);
      const partIndex = this.partOrder.findIndex(
        (part) => part.kind === "tool-call" && part.toolCallId === toolCallId,
      );
      if (partIndex !== -1) this.partOrder.splice(partIndex, 1);
      this.a2uiToolCallIds.delete(toolCallId);
    }
  }

  private reportServerMessageId(messageId: string | undefined): void {
    if (!messageId) return;
    if (this.lastTextMessageId === undefined) {
      this.lastTextMessageId = messageId;
    }
    if (this.serverMessageIdReported) return;
    this.serverMessageIdReported = true;
    this.reportedServerMessageId = messageId;
    this.onServerMessageId?.(messageId);
  }

  private clearTextParts(): void {
    this.textParts.clear();
  }

  private resetMessageParts(): void {
    this.clearTextParts();
    this.reasoningParts.clear();
    this.reasoningSignatures.clear();
    this.reasoningSignatureIds.clear();
    this.reasoningMessageIds.clear();
    this.hiddenSignatures.clear();
    this.hiddenSignatureAnchors.clear();
    this.hiddenBlockAnchors.clear();
    this.hiddenAnonymousAnchor = undefined;
    this.hiddenReasoningIds.clear();
    this.hiddenActiveReasoning = "none";
    this.loggedDroppedOpaqueIds.clear();
    this.anonymousReasoningKeys.clear();
    this.activeReasoningKeyByScope.clear();
    this.nestingMemo = undefined;
    this.subagentRuns.clear();
    this.reasoningPartCounter = 0;
    this.toolCalls.clear();
    this.a2uiBuckets.clear();
    this.a2uiToolCallIds.clear();
    this.lastResolvedToolCallIdByScope.clear();
    this.partOrder.length = 0;
    this.textPartCounter = 0;
    this.activeTextMessageIdByScope.clear();
    this.reportedServerMessageId = undefined;
  }

  // A subagent only ever reports its own terminal, so a run that ends while
  // one is still streaming would leave that nested message spinning forever.
  private closeOpenSubagentRuns(status: MessageStatus): void {
    for (const run of this.subagentRuns.values()) {
      if (run.status.type === "running") run.status = status;
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

  private beginDistinctTextMessage(messageId: string | undefined): void {
    if (
      !messageId ||
      this.lastTextMessageId === undefined ||
      this.lastTextMessageId === messageId ||
      !this.onTextMessageStart
    ) {
      return;
    }
    this.resetMessageParts();
    this.onTextMessageStart(messageId);
  }

  private generateTextKey(): string {
    this.textPartCounter += 1;
    return `text-${this.textPartCounter}`;
  }

  private startTextMessage(scope: string, messageId?: string): string {
    const id = messageId ?? this.generateTextKey();
    const key = this.ensureTextPart(scope, id);
    this.activeTextMessageIdByScope.set(scope, key);
    return key;
  }

  private resolveTextMessageId(scope: string, messageId?: string): string {
    if (messageId) {
      const key = this.ensureTextPart(scope, messageId);
      this.activeTextMessageIdByScope.set(scope, key);
      return key;
    }

    const active = this.activeTextMessageIdByScope.get(scope);
    if (active) {
      return active;
    }

    const key = this.ensureTextPart(scope, this.generateTextKey());
    this.activeTextMessageIdByScope.set(scope, key);
    return key;
  }

  private ensureTextPart(scope: string, id: string): string {
    const key = this.partKey(scope, id);
    if (!this.textParts.has(key)) {
      this.textParts.set(key, { buffer: "" });
      if (
        !this.partOrder.some((part) => part.kind === "text" && part.key === key)
      ) {
        this.partOrder.push(
          scope === ROOT_SCOPE
            ? { kind: "text", key }
            : { kind: "text", key, subagentRunId: scope },
        );
      }
    }
    return key;
  }

  private appendText(id: string, delta: string): void {
    const entry = this.textParts.get(id);
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
    this.activeTextMessageIdByScope.delete(scope);
    if (
      !this.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
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
    this.nestingMemo = undefined;
    this.toolCalls.set(id, state);
  }

  // The message and tool-call channels are unordered on the wire, so anchor a
  // tool call under its parentMessageId text part instead of appending it.
  private insertToolPart(scope: string, id: string, parentMessageId?: string) {
    const entry = { kind: "tool-call", toolCallId: id } as const;
    if (parentMessageId) {
      const parentKey = this.partKey(scope, parentMessageId);
      const parentIndex = this.partOrder.findIndex(
        (part) => part.kind === "text" && part.key === parentKey,
      );
      if (parentIndex !== -1) {
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
    scope: string,
    id: string,
    content: string,
    isError?: boolean,
    toolMessageId?: string,
    mcpResult?: Record<string, unknown>,
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
        snapshotResultApplied: false,
        ...(scope !== ROOT_SCOPE ? { subagentRunId: scope } : {}),
      };
      this.nestingMemo = undefined;
      this.toolCalls.set(id, entry);
    }
    if (
      !this.partOrder.some(
        (part) => part.kind === "tool-call" && part.toolCallId === id,
      )
    ) {
      this.partOrder.push({ kind: "tool-call", toolCallId: id });
    }
    if (mcpResult !== undefined && !entry.snapshotResultApplied) {
      entry.result = mcpResult;
      entry.modelContent = [{ type: "text", text: content }];
      entry.snapshotResultApplied = true;
      entry.isError = isError;
      if (entry.mcpAppResourceUri === undefined) {
        const uri = readMcpAppResourceUri(mcpResult._meta);
        if (uri !== undefined) entry.mcpAppResourceUri = uri;
      }
    } else if (entry.snapshotResultApplied) {
      if (entry.modelContent === undefined) {
        entry.modelContent = [{ type: "text", text: content }];
      }
      if (entry.isError === undefined) {
        entry.isError = isError;
      }
    } else {
      entry.result = tryParseJSON(content);
      entry.isError = isError;
    }
    if (toolMessageId) {
      entry.toolMessageId = toolMessageId;
    }
    this.lastResolvedToolCallIdByScope.set(scope, id);
  }

  private nesting(): {
    subagentsByParentToolCallId: Map<string, string[]>;
    reachable: Set<string>;
  } {
    if (!this.nestingMemo) {
      const subagentsByParentToolCallId = this.subagentsByParentToolCallId();
      this.nestingMemo = {
        subagentsByParentToolCallId,
        reachable: this.reachableSubagentRunIds(subagentsByParentToolCallId),
      };
    }
    return this.nestingMemo;
  }

  private subagentsByParentToolCallId(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const run of this.subagentRuns.values()) {
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
      for (const entry of this.toolCalls.values()) {
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
    const run = this.subagentRuns.get(subagentRunId);
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
        const entry = this.toolCalls.get(part.toolCallId);
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
          const buffer = this.reasoningParts.get(part.key) ?? "";
          const isActive =
            this.activeReasoningKeyByScope.get(rawScope) === part.key;
          if (buffer.length > 0 || isActive) {
            const encryptedValue = this.reasoningSignatures.get(part.key);
            const reasoningId = this.reasoningMessageIds.get(part.key);
            const meta = {
              ...(reasoningId !== undefined ? { reasoningId } : {}),
              ...(encryptedValue !== undefined ? { encryptedValue } : {}),
            };
            snapshot.push({
              type: "reasoning",
              text: buffer,
              ...(Object.keys(meta).length > 0
                ? { providerMetadata: { [AG_UI_METADATA_NAMESPACE]: meta } }
                : {}),
            } as const);
            materialized();
          } else if (isRoot && ctx.root) {
            // A retracted empty block still carries transport state: without
            // a part to live on, its signature rides the message metadata,
            // matching the shape a snapshot reload produces.
            const encryptedValue = this.reasoningSignatures.get(part.key);
            const id = this.reasoningSignatureIds.get(part.key);
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
        const entry = this.textParts.get(part.key);
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
        this.hiddenSignatures,
        ([id, encryptedValue]) => ({
          id,
          encryptedValue,
          anchor: this.hiddenSignatureAnchors.get(id)!,
        }),
      ) as (AgUiOpaqueReasoning & { anchor: number })[],
      lastMaterializedIndex: -1,
    };
    // A run that ended incomplete can no longer be resumed, so a gate left over
    // from an earlier interrupt outcome is unanswerable and must not stay
    // projected. The interrupts themselves are kept on the message, since the
    // bespoke hooks read that payload. Bound ids are exactly the calls that
    // render at root scope, which is also exactly what getPendingToolCalls can
    // reach: a call nested inside a subagent message is unanswerable, so the
    // projector collapses the batch rather than showing half of it.
    const partsByScope = new Map<
      string,
      { index: number; part: PartOrderEntry }[]
    >();
    for (const [index, part] of this.partOrder.entries()) {
      const rawScope =
        part.kind === "tool-call"
          ? (this.toolCalls.get(part.toolCallId)?.subagentRunId ?? ROOT_SCOPE)
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
        this.status?.type === "requires-action" ? this.interrupts : undefined,
        new Set(
          Array.from(this.toolCalls.values())
            .filter(
              (entry) =>
                entry.subagentRunId === undefined ||
                !reachable.has(entry.subagentRunId),
            )
            .map((entry) => entry.toolCallId),
        ),
      ),
      root,
    };
    const snapshot = this.buildParts(ROOT_SCOPE, 0, ctx);
    const { opaqueCandidates, lastMaterializedIndex } = root;

    // An anonymous claim promotes the signature's entityId to a wire message
    // id; when that id actually names a text message or the adopted assistant
    // message id (which can also arrive via TOOL_CALL_START.parentMessageId),
    // replaying it as its own record would put two wire records under one id,
    // so such entries are dropped instead — the same outcome the visible
    // path's claim guard produces for a signature that is "not for this
    // block". Entries with no materialized part after their anchor trail the
    // assistant record, matching the snapshot path's anchor/after
    // bookkeeping.
    const toolMessageIds = new Set<string>();
    for (const call of this.toolCalls.values()) {
      if (call.toolMessageId) toolMessageIds.add(call.toolMessageId);
    }
    opaqueCandidates.sort((a, b) => a.anchor - b.anchor);
    const publishableOpaqueReasoning = opaqueCandidates
      .filter((entry) => {
        const collides =
          this.textParts.has(entry.id) ||
          entry.id === this.reportedServerMessageId ||
          toolMessageIds.has(entry.id);
        if (collides && !this.loggedDroppedOpaqueIds.has(entry.id)) {
          this.loggedDroppedOpaqueIds.add(entry.id);
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
      this.hasEmittedOpaqueReasoning = true;
    // Once an opaque entry has been published this run, the key keeps being
    // emitted (empty when withdrawn) so the namespace merge can retract it.
    const includeOpaque = this.hasEmittedOpaqueReasoning;
    const timing = this.getTiming();
    const metadata = {
      ...(timing ? { timing } : {}),
      ...(this.interrupts || includeOpaque
        ? {
            custom: {
              [AG_UI_METADATA_NAMESPACE]: {
                ...(this.interrupts ? { interrupts: this.interrupts } : {}),
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

  private handleReasoningStart(
    scope: string,
    messageId?: string,
    isMessageId = false,
  ): void {
    if (!this.showThinking) {
      // Hidden-reasoning bookkeeping stays root-only for this task — a
      // subagent's opaque/hidden reasoning signatures are not preserved.
      if (scope !== ROOT_SCOPE) return;
      const anchor = this.partOrder.length;
      if (messageId === undefined) {
        this.hiddenActiveReasoning = "anonymous";
        this.hiddenAnonymousAnchor = anchor;
      } else {
        this.hiddenReasoningIds.add(messageId);
        this.hiddenBlockAnchors.set(messageId, anchor);
        this.hiddenActiveReasoning = "identified";
      }
      return;
    }
    // A reasoning block acts as a boundary: anonymous text arriving after it
    // should be a new part, not appended to any pre-reasoning text — scoped.
    this.activeTextMessageIdByScope.delete(scope);
    const key = this.partKey(
      scope,
      messageId ?? `__auto-reasoning-${++this.reasoningPartCounter}`,
    );
    // Two different questions: which id may be replayed as a ReasoningMessage.id
    // (only the message-scoped aliases carry one), and which block an unmatched
    // signature may claim (any block opened without an id at all).
    if (messageId === undefined) {
      this.anonymousReasoningKeys.add(key);
    } else if (isMessageId) {
      this.reasoningMessageIds.set(key, messageId);
    }
    if (!this.reasoningParts.has(key)) {
      this.reasoningParts.set(key, "");
      this.partOrder.push(
        scope === ROOT_SCOPE
          ? { kind: "reasoning", key }
          : { kind: "reasoning", key, subagentRunId: scope },
      );
    }
    this.activeReasoningKeyByScope.set(scope, key);
    this.emit();
  }

  private handleReasoningContent(
    scope: string,
    delta: string,
    messageId?: string,
    isMessageId = false,
  ): void {
    if (!delta) return;
    if (!this.showThinking) {
      // Content without a preceding START still names the block (the visible
      // path opens it lazily); register it so a signature can claim it.
      if (scope !== ROOT_SCOPE) return;
      if (this.hiddenActiveReasoning === "none") {
        this.handleReasoningStart(scope, messageId, isMessageId);
      }
      return;
    }
    if (!this.activeReasoningKeyByScope.has(scope)) {
      // Content arrived without a preceding START — create the slot lazily.
      this.handleReasoningStart(scope, messageId, isMessageId);
    }
    const key = this.activeReasoningKeyByScope.get(scope);
    if (!key) return;
    this.reasoningParts.set(key, (this.reasoningParts.get(key) ?? "") + delta);
    this.emit();
  }

  private handleReasoningEnd(scope: string): void {
    if (!this.showThinking) {
      if (scope === ROOT_SCOPE) this.hiddenActiveReasoning = "none";
      return;
    }
    this.activeReasoningKeyByScope.delete(scope);
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
