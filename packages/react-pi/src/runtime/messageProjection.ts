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
  data.startsWith("data:") ? data : `data:${mimeType};base64,${data}`;

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
const buildToolResultMap = (messages: readonly PiAgentMessage[]) => {
  const map = new Map<
    string,
    { result: string | undefined; isError: boolean; details: unknown }
  >();
  for (const message of messages) {
    if (message.role !== "toolResult") continue;
    const m = message as PiToolResultMessage;
    map.set(m.toolCallId, {
      result: extractResultText({ content: m.content }),
      isError: m.isError,
      details: m.details,
    });
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

export const projectPiThreadMessages = (
  input: PiProjectionInput,
): ThreadMessageLike[] => {
  const { messages } = input;
  const toolResults = buildToolResultMap(messages);
  const out: ThreadMessageLike[] = [];
  let group: GroupAccumulator | null = null;

  const flush = (isLast: boolean) => {
    if (!group) return;
    out.push(buildAssistantMessage(group, input, isLast));
    group = null;
  };

  messages.forEach((message, index) => {
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
  });

  // A transcript ending on a `toolResult` leaves the assistant group open; mark
  // it last so the live run status ("running") propagates.
  flush(true);
  return out;
};

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

export const projectPiThreadMessagesShared = (
  input: PiProjectionInput,
  previous: readonly ThreadMessageLike[],
): readonly ThreadMessageLike[] =>
  shareProjectedThreadMessages(projectPiThreadMessages(input), previous);

export const projectPiThreadRepository = (input: PiProjectionInput) =>
  ExportedMessageRepository.fromArray(projectPiThreadMessages(input));

// re-exported helper purely for tests / advanced consumers
export type { ContentPart as PiProjectedContentPart };
export type { PiToolResultContent };
