import type {
  ThreadAssistantMessage,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  iterateToolCallParts,
  mapToolCallPartsDeep,
} from "@assistant-ui/core/internal";

import { preserveToolApprovalDecision } from "./tool-approval";

type Content = ThreadAssistantMessage["content"];
type Part = Content[number];

export function groupReplayToolContent(
  owners: readonly ThreadAssistantMessage[],
  content: Content,
  fallbackMessageId: string,
): Map<string, Part[]> {
  const ownerByToolCallId = new Map<string, string>();
  for (const owner of owners) {
    for (const part of iterateToolCallParts(owner.content)) {
      if (!ownerByToolCallId.has(part.toolCallId))
        ownerByToolCallId.set(part.toolCallId, owner.id);
    }
  }
  const grouped = new Map<string, Part[]>([[fallbackMessageId, []]]);
  for (const part of content) {
    const ownerId =
      part.type === "tool-call"
        ? (ownerByToolCallId.get(part.toolCallId) ?? fallbackMessageId)
        : fallbackMessageId;
    const parts = grouped.get(ownerId) ?? [];
    parts.push(part);
    grouped.set(ownerId, parts);
  }
  return grouped;
}

export function preserveToolResult(
  previous: ToolCallMessagePart,
  next: ToolCallMessagePart,
): ToolCallMessagePart {
  if (previous.result === undefined || next.result !== undefined) return next;
  return {
    ...next,
    result: previous.result,
    ...(previous.artifact !== undefined ? { artifact: previous.artifact } : {}),
    ...(previous.isError !== undefined ? { isError: previous.isError } : {}),
    ...(previous.modelContent !== undefined
      ? { modelContent: previous.modelContent }
      : {}),
  };
}

function mergeOrdered<T>(
  previous: readonly (readonly [T, string])[],
  next: readonly (readonly [T, string])[],
  merge: (old: T, fresh: T) => T,
): T[] {
  const old = new Map(previous.map(([value, key]) => [key, value] as const));
  const indexes = new Map(next.map(([, key], index) => [key, index] as const));
  const insertions: T[][] = Array.from({ length: next.length + 1 }, () => []);
  let predecessor = -1;
  for (const [value, key] of previous) {
    const index = indexes.get(key);
    if (index === undefined) insertions[predecessor + 1]!.push(value);
    else predecessor = index;
  }
  const result: T[] = [];
  for (const [index, [value, key]] of next.entries()) {
    const prior = old.get(key);
    result.push(
      ...insertions[index]!,
      prior === undefined ? value : merge(prior, value),
    );
  }
  result.push(...insertions[next.length]!);
  return result;
}

function mergeMessages(
  previous: readonly ThreadMessage[],
  next: readonly ThreadMessage[],
): readonly ThreadMessage[] {
  return mergeOrdered(
    previous.map((message) => [message, message.id] as const),
    next.map((message) => [message, message.id] as const),
    (old, fresh) =>
      old.role === "assistant" && fresh.role === "assistant"
        ? { ...fresh, content: mergeReplayContent(old.content, fresh.content) }
        : fresh,
  );
}

function mergeTool(
  previous: ToolCallMessagePart,
  next: ToolCallMessagePart,
): ToolCallMessagePart {
  const result = preserveToolResult(previous, next);
  const approval = next.approval ?? previous.approval;
  return {
    ...result,
    ...(approval
      ? { approval: preserveToolApprovalDecision(previous.approval, approval) }
      : {}),
    ...(result.unstable_interactions === undefined &&
    previous.unstable_interactions !== undefined
      ? { unstable_interactions: previous.unstable_interactions }
      : {}),
    ...(previous.messages !== undefined || next.messages !== undefined
      ? {
          messages: mergeMessages(previous.messages ?? [], next.messages ?? []),
        }
      : {}),
  };
}

function partKey(part: Part): string {
  if (part.type === "tool-call") return `tool:${part.toolCallId}`;
  if (part.type === "text" || part.type === "reasoning") return part.type;
  if ("id" in part && typeof part.id === "string" && part.id)
    return `${part.type}:${part.id}`;
  if (part.type === "data") return `data:${part.name}`;
  return part.type;
}

function keyed(content: Content): [Part, string][] {
  const ordinals = new Map<string, number>();
  return content.map((part) => {
    const base = partKey(part);
    const ordinal = ordinals.get(base) ?? 0;
    ordinals.set(base, ordinal + 1);
    return [part, `${base}:${ordinal}`] as [Part, string];
  });
}

function identity(part: Part, key: string, scope: readonly string[]): string {
  return JSON.stringify(
    part.type === "tool-call" ? ["tool", part.toolCallId] : [...scope, key],
  );
}

function visitMessages(
  messages: readonly ThreadMessage[],
  scope: readonly string[],
  visit: (key: string) => void,
): void {
  for (const message of messages) {
    const path = [...scope, "message", message.id];
    visit(JSON.stringify(path));
    if (message.role === "assistant")
      visitContent(message.content, path, visit);
  }
}

function visitContent(
  content: Content,
  scope: readonly string[],
  visit: (key: string) => void,
): void {
  for (const [part, key] of keyed(content)) {
    visit(identity(part, key, scope));
    if (part.type === "tool-call" && part.messages)
      visitMessages(part.messages, ["tool", part.toolCallId], visit);
  }
}

function pruneMessages(
  messages: readonly ThreadMessage[],
  scope: readonly string[],
  present: ReadonlySet<string>,
  owned: ReadonlySet<string>,
): { messages: readonly ThreadMessage[]; hasCurrent: boolean } {
  let hasCurrent = false;
  const kept = messages.flatMap((message) => {
    const path = [...scope, "message", message.id];
    const key = JSON.stringify(path);
    const nested =
      message.role === "assistant"
        ? pruneContent(message.content, path, present, owned)
        : undefined;
    const current = present.has(key) || (nested?.hasCurrent ?? false);
    if (owned.has(key) && !current) return [];
    hasCurrent ||= current;
    return [
      nested && message.role === "assistant"
        ? { ...message, content: nested.content }
        : message,
    ];
  });
  return { messages: kept, hasCurrent };
}

function pruneContent(
  content: Content,
  scope: readonly string[],
  present: ReadonlySet<string>,
  owned: ReadonlySet<string>,
): { content: Content; hasCurrent: boolean } {
  let hasCurrent = false;
  const kept = keyed(content).flatMap(([part, localKey]) => {
    const key = identity(part, localKey, scope);
    const nested =
      part.type === "tool-call" && part.messages
        ? pruneMessages(
            part.messages,
            ["tool", part.toolCallId],
            present,
            owned,
          )
        : undefined;
    const current = present.has(key) || (nested?.hasCurrent ?? false);
    if (owned.has(key) && !current) return [];
    hasCurrent ||= current;
    return [nested ? { ...part, messages: nested.messages } : part];
  });
  return { content: kept, hasCurrent };
}

export function createReplayContentMerger(): (
  previous: Content,
  next: Content,
) => Content {
  // Remember stream-owned identities, never a second copy of tool payloads.
  const owned = new Set<string>();
  return (previous, next) => {
    const present = new Set<string>();
    visitContent(next, [], (key) => present.add(key));
    for (const key of present) owned.add(key);
    return pruneContent(mergeReplayContent(previous, next), [], present, owned)
      .content;
  };
}

function nestedToolIds(content: Content): Set<string> {
  const nestedIds = new Set<string>();
  for (const part of content) {
    if (part.type !== "tool-call") continue;
    for (const message of part.messages ?? []) {
      if (message.role !== "assistant") continue;
      for (const child of iterateToolCallParts(message.content)) {
        nestedIds.add(child.toolCallId);
      }
    }
  }
  return nestedIds;
}

function mergeReplayContent(previous: Content, next: Content): Content {
  const nestedIds = nestedToolIds(previous);
  const incomingNestedIds = nestedToolIds(next);
  const movingRoots = new Map(
    previous.flatMap((part) =>
      part.type === "tool-call" && incomingNestedIds.has(part.toolCallId)
        ? [[part.toolCallId, part] as const]
        : [],
    ),
  );
  const flattened = new Map<string, ToolCallMessagePart>();
  for (const part of next) {
    if (part.type === "tool-call" && nestedIds.has(part.toolCallId)) {
      flattened.set(part.toolCallId, part);
    }
  }
  const prior = (
    flattened.size
      ? mapToolCallPartsDeep(previous, (part) => {
          const fresh = flattened.get(part.toolCallId);
          return fresh ? mergeTool(part, fresh) : part;
        }).content
      : previous
  ).filter(
    (part) => part.type !== "tool-call" || !movingRoots.has(part.toolCallId),
  );
  let incoming = next.filter(
    (part) => part.type !== "tool-call" || !flattened.has(part.toolCallId),
  );
  if (movingRoots.size) {
    incoming = [
      ...mapToolCallPartsDeep(incoming, (part) => {
        const prior = movingRoots.get(part.toolCallId);
        return prior ? mergeTool(prior, part) : part;
      }).content,
    ];
  }
  return mergeOrdered(keyed(prior), keyed(incoming), (old, fresh) => {
    if (old.type === "tool-call" && fresh.type === "tool-call")
      return mergeTool(old, fresh);
    if (
      (old.type === "text" || old.type === "reasoning") &&
      (fresh.type === "text" || fresh.type === "reasoning") &&
      old.text.startsWith(fresh.text) &&
      old.text.length > fresh.text.length
    ) {
      return { ...fresh, text: old.text };
    }
    return fresh;
  });
}
