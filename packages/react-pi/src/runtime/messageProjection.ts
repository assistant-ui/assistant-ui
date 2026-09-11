/**
 * Pure projection of the canonical Pi transcript (`PiAgentMessage[]`) into
 * assistant-ui's `ThreadMessageLike[]` / `ExportedMessageRepository`.
 *
 * Design:
 * - Each Pi *turn* is one assistant message (text/thinking/toolCall parts). A
 *   multi-step run is several assistant messages interleaved with `toolResult`
 *   messages. We MERGE a maximal run of assistant + toolResult messages into a
 *   single assistant `ThreadMessageLike`, with one `ThreadStep` per turn and
 *   `parentId` linking each turn's parts to its step (so chain-of-thought + tool
 *   work group visually).
 * - `toolResult` messages are paired into their `tool-call` part by
 *   `toolCallId` (parallel tools finish out of source order — pairing is by id,
 *   not position).
 * - Live streaming tool output (`toolExecutions[id].partialResult`) fills a
 *   tool-call's `result` until the final `toolResult` message lands.
 * - Tool-associated host-UI requests project onto the tool-call as native
 *   `approval` (confirm) / `interrupt` (select/input/editor). Free-standing
 *   requests stay on the side channel (not projected here).
 * - Every other Pi role (`bashExecution`, `custom`, `branchSummary`,
 *   `compactionSummary`, unknown) becomes a standalone `DataMessagePart`.
 *
 * Browser-safe; imports no `@earendil-works/*` packages.
 */

import { ExportedMessageRepository } from "@assistant-ui/react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { PiThreadState } from "./threadState";
import type {
  PiAgentMessage,
  PiAssistantMessage,
  PiBashExecutionMessage,
  PiBranchSummaryMessage,
  PiCompactionSummaryMessage,
  PiCustomMessage,
  PiHostUiRequest,
  PiToolResultContent,
  PiToolResultMessage,
  PiUserContent,
  PiUserMessage,
} from "../types";

type ContentPart = Exclude<ThreadMessageLike["content"], string>[number];
type ToolCallPart = Extract<ContentPart, { type: "tool-call" }>;
type Step = NonNullable<
  NonNullable<ThreadMessageLike["metadata"]>["steps"]
>[number];

export interface PiProjectionInput {
  messages: readonly PiAgentMessage[];
  toolExecutions: PiThreadState["toolExecutions"];
  runStatus: PiThreadState["runStatus"];
  hostUiRequests: readonly PiHostUiRequest[];
}

const messageId = (index: number) => `pi-msg:${index}`;
const stepId = (index: number) => `pi-step:${index}`;

const toDataUrl = (data: string, mimeType: string) =>
  /^data:/i.test(data) ? data : `data:${mimeType};base64,${data}`;

const createdAtOf = (message: { timestamp?: number }): Date =>
  new Date(typeof message.timestamp === "number" ? message.timestamp : 0);

/** Join the renderable text of a tool result / partial result content array. */
const extractResultText = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .filter(
      (p): p is { type: "text"; text: string } =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("");
  return text;
};

const projectUserContent = (
  content: PiUserMessage["content"],
): ContentPart[] => {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content.map((part: PiUserContent): ContentPart => {
    if (part.type === "image") {
      return { type: "image", image: toDataUrl(part.data, part.mimeType) };
    }
    return { type: "text", text: part.text };
  });
};

const dataPart = (
  name: string,
  data: Record<string, unknown>,
): ContentPart => ({
  type: "data",
  name,
  data,
});

/** Build the toolCallId → result pairing map across the whole transcript so
 * out-of-order parallel results pair correctly. */
type ProjectedToolResult = {
  result: string | undefined;
  isError: boolean;
  details: unknown;
};

const projectToolResult = (
  message: PiToolResultMessage,
): ProjectedToolResult => ({
  result: extractResultText({ content: message.content }),
  isError: message.isError,
  details: message.details,
});

const buildToolResultMap = (messages: readonly PiAgentMessage[]) => {
  const map = new Map<string, ProjectedToolResult>();
  for (const message of messages) {
    if (message.role !== "toolResult") continue;
    const m = message as PiToolResultMessage;
    map.set(m.toolCallId, projectToolResult(m));
  }
  return map;
};

type GroupAccumulator = {
  firstIndex: number;
  parts: ContentPart[];
  steps: Step[];
  /** The most recent assistant message in the group (drives final status). */
  lastAssistant: PiAssistantMessage;
  hasPendingHostUi: boolean;
  hostUiReason: "tool-calls" | "interrupt";
};

const projectAssistantInto = (
  group: GroupAccumulator,
  message: PiAssistantMessage,
  index: number,
  input: PiProjectionInput,
  toolResults: ReturnType<typeof buildToolResultMap>,
) => {
  const parentId = stepId(index);
  group.lastAssistant = message;
  group.steps.push({
    messageId: parentId,
    usage: {
      inputTokens: message.usage?.input ?? 0,
      outputTokens: message.usage?.output ?? 0,
    },
  });

  for (const part of message.content) {
    if (part.type === "text") {
      group.parts.push({ type: "text", text: part.text, parentId });
    } else if (part.type === "thinking") {
      const text =
        part.thinking || (part.redacted ? "[reasoning redacted]" : "");
      group.parts.push({ type: "reasoning", text, parentId });
    } else if (part.type === "toolCall") {
      const paired = toolResults.get(part.id);
      const live = input.toolExecutions[part.id];
      const result =
        paired?.result ??
        (live ? extractResultText(live.partialResult) : undefined);
      const isError = paired?.isError ?? live?.status === "error";

      const hostUi = input.hostUiRequests.find((r) => r.toolCallId === part.id);

      const toolCall: ToolCallPart = {
        type: "tool-call",
        toolCallId: part.id,
        toolName: part.name,
        args: (part.arguments ?? {}) as unknown as NonNullable<
          ToolCallPart["args"]
        >,
        argsText: JSON.stringify(part.arguments ?? {}),
        parentId,
        ...(result !== undefined ? { result } : {}),
        ...(isError ? { isError: true } : {}),
        ...(hostUi ? hostUiToToolField(hostUi) : {}),
      };

      if (hostUi) {
        group.hasPendingHostUi = true;
        group.hostUiReason =
          hostUi.kind === "confirm" ? "tool-calls" : "interrupt";
      }
      group.parts.push(toolCall);
    }
    // unknown assistant content parts are dropped (open union forward-compat:
    // the transcript remains canonical; the snapshot self-heals).
  }
};

const hostUiToToolField = (request: PiHostUiRequest): Partial<ToolCallPart> => {
  if (request.kind === "confirm") {
    // Pending approval: omit `approved` (undefined = awaiting answer).
    return { approval: { id: request.id } };
  }
  return {
    interrupt: {
      type: "human",
      payload: { requestId: request.id, ...request },
    },
  };
};

const buildAssistantMessage = (
  group: GroupAccumulator,
  input: PiProjectionInput,
  isLastMessageInTranscript: boolean,
): ThreadMessageLike => {
  const last = group.lastAssistant;
  const status = assistantStatus(group, input, isLastMessageInTranscript);

  return {
    id: messageId(group.firstIndex),
    role: "assistant",
    createdAt: createdAtOf(last),
    content: group.parts,
    ...(status ? { status } : {}),
    metadata: {
      steps: group.steps,
      custom: {
        pi: {
          provider: last.provider,
          model: last.model,
          api: last.api,
          usage: last.usage,
          stopReason: last.stopReason,
          ...(last.errorMessage ? { errorMessage: last.errorMessage } : {}),
        },
      },
    },
  };
};

const assistantStatus = (
  group: GroupAccumulator,
  input: PiProjectionInput,
  isLastMessageInTranscript: boolean,
): ThreadMessageLike["status"] => {
  if (group.hasPendingHostUi) {
    return { type: "requires-action", reason: group.hostUiReason };
  }
  const last = group.lastAssistant;
  if (
    input.runStatus === "running" &&
    isLastMessageInTranscript &&
    last.stopReason !== "error" &&
    last.stopReason !== "aborted"
  ) {
    return { type: "running" };
  }
  if (last.stopReason === "error") {
    return {
      type: "incomplete",
      reason: "error",
      ...(last.errorMessage ? { error: last.errorMessage } : {}),
    };
  }
  if (last.stopReason === "aborted") {
    return { type: "incomplete", reason: "cancelled" };
  }
  if (last.stopReason === "length") {
    return { type: "incomplete", reason: "length" };
  }
  return { type: "complete", reason: "stop" };
};

const projectPiThreadMessagesFrom = (
  input: PiProjectionInput,
  startIndex: number,
  toolResults: ReturnType<typeof buildToolResultMap>,
): ThreadMessageLike[] => {
  const { messages } = input;
  const out: ThreadMessageLike[] = [];
  let group: GroupAccumulator | null = null;

  const flush = (isLast: boolean) => {
    if (!group) return;
    out.push(buildAssistantMessage(group, input, isLast));
    group = null;
  };

  for (let index = startIndex; index < messages.length; index++) {
    const message = messages[index]!;
    const isLast = index === messages.length - 1;
    switch (message.role) {
      case "assistant": {
        if (!group) {
          group = {
            firstIndex: index,
            parts: [],
            steps: [],
            lastAssistant: message as PiAssistantMessage,
            hasPendingHostUi: false,
            hostUiReason: "tool-calls",
          };
        }
        projectAssistantInto(
          group,
          message as PiAssistantMessage,
          index,
          input,
          toolResults,
        );
        // If this is the final transcript message, the group's status reflects
        // the live run; flush so that propagates.
        if (isLast) flush(true);
        break;
      }

      case "toolResult":
        // Paired into the tool-call part by id; never emitted standalone.
        // Keeps the assistant group open so following assistant turns merge in.
        break;

      case "user":
        flush(false);
        out.push({
          id: messageId(index),
          role: "user",
          createdAt: createdAtOf(message as PiUserMessage),
          content: projectUserContent((message as PiUserMessage).content),
        });
        break;

      case "bashExecution": {
        flush(false);
        const m = message as PiBashExecutionMessage;
        out.push(
          standaloneData(index, m, "pi-bash-execution", {
            command: m.command,
            output: m.output,
            exitCode: m.exitCode,
            cancelled: m.cancelled,
            truncated: m.truncated,
            fullOutputPath: m.fullOutputPath,
          }),
        );
        break;
      }

      case "custom": {
        flush(false);
        const m = message as PiCustomMessage;
        if (!m.display) break; // hidden from UI, still in LLM context
        out.push({
          id: messageId(index),
          role: "assistant",
          createdAt: createdAtOf(m),
          content: [
            dataPart("pi-custom-message", {
              customType: m.customType,
              details: m.details,
            }),
            ...projectUserContent(m.content),
          ],
        });
        break;
      }

      case "branchSummary": {
        flush(false);
        const m = message as PiBranchSummaryMessage;
        out.push(
          standaloneData(index, m, "pi-branch-summary", {
            summary: m.summary,
            fromId: m.fromId,
          }),
        );
        break;
      }

      case "compactionSummary": {
        flush(false);
        const m = message as PiCompactionSummaryMessage;
        out.push(
          standaloneData(index, m, "pi-compaction-summary", {
            summary: m.summary,
            tokensBefore: m.tokensBefore,
          }),
        );
        break;
      }

      default:
        flush(false);
        out.push(
          standaloneData(index, message, "pi-unsupported-message", {
            role: message.role,
            message,
          }),
        );
        break;
    }
  }

  // A transcript ending on a `toolResult` leaves the assistant group open; mark
  // it last so the live run status ("running") propagates.
  flush(true);
  return out;
};

export const projectPiThreadMessages = (
  input: PiProjectionInput,
): ThreadMessageLike[] =>
  projectPiThreadMessagesFrom(input, 0, buildToolResultMap(input.messages));

const standaloneData = (
  index: number,
  message: { timestamp?: number },
  name: string,
  data: Record<string, unknown>,
): ThreadMessageLike => ({
  id: messageId(index),
  role: "assistant",
  createdAt: createdAtOf(message),
  content: [dataPart(name, data)],
});

const isDateEqual = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : undefined;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  const dateEqual = isDateEqual(a, b);
  if (dateEqual !== undefined) return dateEqual;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
};

const sameThreadMessageLike = (
  a: ThreadMessageLike,
  b: ThreadMessageLike,
): boolean =>
  a.id === b.id &&
  a.role === b.role &&
  deepEqual(a.createdAt, b.createdAt) &&
  deepEqual(a.content, b.content) &&
  deepEqual(a.status, b.status) &&
  deepEqual(a.metadata, b.metadata);

export const shareProjectedThreadMessages = (
  next: readonly ThreadMessageLike[],
  previous: readonly ThreadMessageLike[],
): readonly ThreadMessageLike[] => {
  let changed = next.length !== previous.length;
  const shared = next.map((message, index) => {
    const prev = previous[index];
    if (prev && sameThreadMessageLike(message, prev)) return prev;
    changed = true;
    return message;
  });

  return changed ? shared : previous;
};

const firstChangedMessageIndex = (
  previous: readonly PiAgentMessage[],
  next: readonly PiAgentMessage[],
): number | undefined => {
  const sharedLength = Math.min(previous.length, next.length);
  for (let index = 0; index < sharedLength; index++) {
    if (previous[index] !== next[index]) return index;
  }
  return previous.length === next.length ? undefined : sharedLength;
};

const collectToolResultIds = (
  messages: readonly PiAgentMessage[],
  startIndex: number,
  ids: Set<string>,
) => {
  for (let index = startIndex; index < messages.length; index++) {
    const message = messages[index]!;
    if (message.role === "toolResult") {
      ids.add((message as PiToolResultMessage).toolCallId);
    }
  }
};

const updateToolResults = (
  toolResults: Map<string, ProjectedToolResult>,
  previous: readonly PiAgentMessage[],
  next: readonly PiAgentMessage[],
  startIndex: number,
) => {
  const removedIds = new Set<string>();
  for (let index = startIndex; index < previous.length; index++) {
    const message = previous[index]!;
    if (message.role === "toolResult") {
      const id = (message as PiToolResultMessage).toolCallId;
      removedIds.add(id);
      toolResults.delete(id);
    }
  }
  for (let index = startIndex; index < next.length; index++) {
    const message = next[index]!;
    if (message.role === "toolResult") {
      const result = message as PiToolResultMessage;
      removedIds.delete(result.toolCallId);
      toolResults.set(result.toolCallId, projectToolResult(result));
    }
  }
  for (const id of removedIds) {
    for (
      let index = Math.min(startIndex, next.length) - 1;
      index >= 0;
      index--
    ) {
      const message = next[index]!;
      if (
        message.role === "toolResult" &&
        (message as PiToolResultMessage).toolCallId === id
      ) {
        toolResults.set(id, projectToolResult(message as PiToolResultMessage));
        break;
      }
    }
  }
};

const updateToolCallIndices = (
  indices: Map<string, number>,
  previous: readonly PiAgentMessage[],
  next: readonly PiAgentMessage[],
  startIndex: number,
) => {
  const removedIds = new Set<string>();
  for (let index = startIndex; index < previous.length; index++) {
    const message = previous[index]!;
    if (message.role !== "assistant") continue;
    for (const part of (message as PiAssistantMessage).content) {
      if (part.type === "toolCall") {
        removedIds.add(part.id);
        indices.delete(part.id);
      }
    }
  }
  for (let index = startIndex; index < next.length; index++) {
    const message = next[index]!;
    if (message.role !== "assistant") continue;
    for (const part of (message as PiAssistantMessage).content) {
      if (part.type === "toolCall") {
        removedIds.delete(part.id);
        indices.set(part.id, index);
      }
    }
  }
  for (const id of removedIds) {
    for (
      let index = Math.min(startIndex, next.length) - 1;
      index >= 0;
      index--
    ) {
      const message = next[index]!;
      if (message.role !== "assistant") continue;
      if (
        (message as PiAssistantMessage).content.some(
          (part) => part.type === "toolCall" && part.id === id,
        )
      ) {
        indices.set(id, index);
        break;
      }
    }
  }
};

const buildToolCallIndices = (messages: readonly PiAgentMessage[]) => {
  const indices = new Map<string, number>();
  updateToolCallIndices(indices, [], messages, 0);
  return indices;
};

const changedToolExecutionIds = (
  previous: PiProjectionInput["toolExecutions"],
  next: PiProjectionInput["toolExecutions"],
): Set<string> => {
  const ids = new Set<string>();
  if (previous === next) return ids;
  for (const id of Object.keys(previous)) {
    if (previous[id] !== next[id]) ids.add(id);
  }
  for (const id of Object.keys(next)) {
    if (previous[id] !== next[id]) ids.add(id);
  }
  return ids;
};

const changedHostUiToolCallIds = (
  previous: readonly PiHostUiRequest[],
  next: readonly PiHostUiRequest[],
): Set<string> => {
  const ids = new Set<string>();
  if (previous === next) return ids;
  if (
    previous.length === next.length &&
    previous.every((request, index) => request === next[index])
  ) {
    return ids;
  }
  for (const request of previous) {
    if (request.toolCallId) ids.add(request.toolCallId);
  }
  for (const request of next) {
    if (request.toolCallId) ids.add(request.toolCallId);
  }
  return ids;
};

const isAssistantGroupMessage = (message: PiAgentMessage | undefined) => {
  const role = message?.role;
  return role === "assistant" || role === "toolResult";
};

const assistantGroupStart = (
  messages: readonly PiAgentMessage[],
  index: number,
) => {
  if (index >= messages.length || !isAssistantGroupMessage(messages[index])) {
    return index;
  }
  let start = index;
  while (start > 0 && isAssistantGroupMessage(messages[start - 1])) start -= 1;
  return start;
};

const lastAssistantMessageIndex = (messages: readonly PiAgentMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]!.role === "assistant") return index;
  }
  return undefined;
};

const trailingAssistantMessageIndex = (messages: readonly PiAgentMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index--) {
    const role = messages[index]!.role;
    if (role === "assistant") return index;
    if (role !== "toolResult") return undefined;
  }
  return undefined;
};

const projectedSourceIndex = (message: ThreadMessageLike) => {
  if (typeof message.id !== "string" || !message.id.startsWith("pi-msg:")) {
    return undefined;
  }
  const index = Number(message.id.slice("pi-msg:".length));
  return Number.isSafeInteger(index) && index >= 0 ? index : undefined;
};

const firstProjectedIndexAtOrAfter = (
  messages: readonly ThreadMessageLike[],
  sourceIndex: number,
): number | undefined => {
  let low = 0;
  let high = messages.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const projectedIndex = projectedSourceIndex(messages[middle]!);
    if (projectedIndex === undefined) return undefined;
    if (projectedIndex >= sourceIndex) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
};

export class PiThreadMessageProjector {
  private previousInput: PiProjectionInput | undefined;
  private projectedMessages: readonly ThreadMessageLike[] = [];
  private changedProjectedIndex: number | undefined;
  private toolResults = new Map<string, ProjectedToolResult>();
  private toolCallIndices = new Map<string, number>();

  public getChangedProjectedIndex() {
    return this.changedProjectedIndex;
  }

  public project(input: PiProjectionInput): readonly ThreadMessageLike[] {
    const previousInput = this.previousInput;
    if (!previousInput) {
      const previousProjectedMessages = this.projectedMessages;
      this.toolResults = buildToolResultMap(input.messages);
      this.toolCallIndices = buildToolCallIndices(input.messages);
      this.projectedMessages = shareProjectedThreadMessages(
        projectPiThreadMessagesFrom(input, 0, this.toolResults),
        this.projectedMessages,
      );
      this.changedProjectedIndex =
        this.projectedMessages === previousProjectedMessages ? undefined : 0;
      this.previousInput = input;
      return this.projectedMessages;
    }

    const messageChangeIndex = firstChangedMessageIndex(
      previousInput.messages,
      input.messages,
    );
    const affectedToolCallIds = changedToolExecutionIds(
      previousInput.toolExecutions,
      input.toolExecutions,
    );
    for (const id of changedHostUiToolCallIds(
      previousInput.hostUiRequests,
      input.hostUiRequests,
    )) {
      affectedToolCallIds.add(id);
    }

    let dirtyIndex = messageChangeIndex;
    if (messageChangeIndex !== undefined) {
      for (const index of [
        trailingAssistantMessageIndex(previousInput.messages),
        trailingAssistantMessageIndex(input.messages),
      ]) {
        if (index !== undefined) {
          dirtyIndex = Math.min(dirtyIndex, index);
        }
      }
      collectToolResultIds(
        previousInput.messages,
        messageChangeIndex,
        affectedToolCallIds,
      );
      collectToolResultIds(
        input.messages,
        messageChangeIndex,
        affectedToolCallIds,
      );
    }

    for (const id of affectedToolCallIds) {
      const index = this.toolCallIndices.get(id);
      if (index !== undefined) {
        dirtyIndex =
          dirtyIndex === undefined ? index : Math.min(dirtyIndex, index);
      }
    }

    if (messageChangeIndex !== undefined) {
      updateToolResults(
        this.toolResults,
        previousInput.messages,
        input.messages,
        messageChangeIndex,
      );
      updateToolCallIndices(
        this.toolCallIndices,
        previousInput.messages,
        input.messages,
        messageChangeIndex,
      );
      for (const id of affectedToolCallIds) {
        const index = this.toolCallIndices.get(id);
        if (index !== undefined) {
          dirtyIndex =
            dirtyIndex === undefined ? index : Math.min(dirtyIndex, index);
        }
      }
    }

    if (previousInput.runStatus !== input.runStatus) {
      const index = lastAssistantMessageIndex(input.messages);
      if (index !== undefined) {
        dirtyIndex =
          dirtyIndex === undefined ? index : Math.min(dirtyIndex, index);
      }
    }

    if (dirtyIndex === undefined) {
      this.changedProjectedIndex = undefined;
      this.previousInput = input;
      return this.projectedMessages;
    }

    const startIndex = Math.min(
      assistantGroupStart(previousInput.messages, dirtyIndex),
      assistantGroupStart(input.messages, dirtyIndex),
    );
    const projectedBoundary = firstProjectedIndexAtOrAfter(
      this.projectedMessages,
      startIndex,
    );
    const projectedStartIndex = projectedBoundary ?? 0;
    const projectionStartIndex =
      projectedBoundary === undefined ? 0 : startIndex;
    const previousSuffix = this.projectedMessages.slice(projectedStartIndex);
    const nextSuffix = shareProjectedThreadMessages(
      projectPiThreadMessagesFrom(
        input,
        projectionStartIndex,
        this.toolResults,
      ),
      previousSuffix,
    );

    if (
      nextSuffix.length === previousSuffix.length &&
      nextSuffix.every(
        (message, index) =>
          message === this.projectedMessages[projectedStartIndex + index],
      )
    ) {
      this.changedProjectedIndex = undefined;
      this.previousInput = input;
      return this.projectedMessages;
    }

    this.projectedMessages = [
      ...this.projectedMessages.slice(0, projectedStartIndex),
      ...nextSuffix,
    ];
    this.changedProjectedIndex = projectedStartIndex;
    this.previousInput = input;
    return this.projectedMessages;
  }
}

export const projectPiThreadRepository = (input: PiProjectionInput) =>
  ExportedMessageRepository.fromArray(projectPiThreadMessages(input));

// re-exported helper purely for tests / advanced consumers
export type { ContentPart as PiProjectedContentPart };
export type { PiToolResultContent };
