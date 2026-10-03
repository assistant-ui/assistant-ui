"use client";

import type {
  FileMessagePart,
  ImageMessagePart,
  MessageStatus,
  TextMessagePart,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ToolApprovalOption,
  ToolApprovalOptionKind,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  isRecord,
  parseDataUrl,
  resolveFilePartSource,
} from "@assistant-ui/core/internal";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type {
  AcpContentBlock,
  AcpEmbeddedResourceContentBlock,
  AcpPermissionOption,
  AcpPermissionOptionKind,
  AcpPermissionOutcome,
  AcpPermissionRequest,
  AcpPromptCapabilities,
  AcpResourceLinkContentBlock,
  AcpStopReason,
  AcpToolCallContent,
  AcpToolCallStatus,
  AcpToolCallUpdate,
} from "./types";

type AssistantPart = ThreadAssistantMessage["content"][number];

const isSettled = (status: AcpToolCallStatus) =>
  status === "completed" || status === "failed";

export function threadContentToAcpBlocks(
  content: ThreadUserMessage["content"],
): AcpContentBlock[] {
  const blocks: AcpContentBlock[] = [];
  for (const part of content) {
    switch (part.type) {
      case "text": {
        if (part.text) blocks.push({ type: "text", text: part.text });
        break;
      }
      case "image": {
        if (!part.image) break;
        const parsed = parseDataUrl(part.image);
        blocks.push(
          parsed
            ? { type: "image", data: parsed.data, mimeType: parsed.mimeType }
            : {
                type: "resource_link",
                uri: part.image,
                name: part.filename || part.image,
              },
        );
        break;
      }
      case "audio": {
        const data = part.audio?.data;
        if (!data) break;
        blocks.push({
          type: "audio",
          data,
          mimeType: `audio/${part.audio?.format ?? "mp3"}`,
        });
        break;
      }
      case "file": {
        const source = resolveFilePartSource(part);
        if (source.kind === "url") {
          blocks.push({
            type: "resource_link",
            uri: source.url,
            name: part.filename || source.url,
            ...(part.mimeType ? { mimeType: part.mimeType } : undefined),
          });
          break;
        }
        const mimeType =
          source.mimeType || part.mimeType || "application/octet-stream";
        if (mimeType.startsWith("image/")) {
          blocks.push({ type: "image", data: source.data, mimeType });
          break;
        }
        if (mimeType.startsWith("audio/")) {
          blocks.push({ type: "audio", data: source.data, mimeType });
          break;
        }
        blocks.push({
          type: "resource",
          resource: {
            uri: `file:///${part.filename ?? "attachment"}`,
            mimeType,
            blob: source.data,
          },
        });
        break;
      }
    }
  }
  return blocks;
}

export type AcpPromptBlocks = {
  readonly blocks: AcpContentBlock[];
  readonly dropped: AcpContentBlock[];
};

const resourceLinkOf = (
  block: AcpEmbeddedResourceContentBlock,
): AcpResourceLinkContentBlock => ({
  type: "resource_link",
  uri: block.resource.uri,
  name: block.resource.uri,
  ...(block.resource.mimeType
    ? { mimeType: block.resource.mimeType }
    : undefined),
});

/** A `file:` URI names a client-local file, which the agent cannot fetch. */
const isAgentRetrievable = (uri: string) => !/^file:/i.test(uri);

/**
 * Text and resource links are the ACP baseline; every other block type has to
 * be opted into through `promptCapabilities`. An embedded resource the agent
 * cannot accept keeps whatever survives: its text travels as text, and a URI
 * the agent can fetch travels as a resource link. Inline bytes behind a
 * client-local URI survive neither way and are withheld like any other block
 * the agent cannot accept.
 */
export function filterPromptBlocks(
  blocks: readonly AcpContentBlock[],
  capabilities: AcpPromptCapabilities | undefined,
): AcpPromptBlocks {
  const kept: AcpContentBlock[] = [];
  const dropped: AcpContentBlock[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "image":
        (capabilities?.image ? kept : dropped).push(block);
        break;
      case "audio":
        (capabilities?.audio ? kept : dropped).push(block);
        break;
      case "resource": {
        if (capabilities?.embeddedContext) {
          kept.push(block);
          break;
        }
        const text = "text" in block.resource ? block.resource.text : undefined;
        if (text !== undefined) kept.push({ type: "text", text });
        else if (isAgentRetrievable(block.resource.uri))
          kept.push(resourceLinkOf(block));
        else dropped.push(block);
        break;
      }
      default:
        kept.push(block);
    }
  }
  return { blocks: kept, dropped };
}

const blockToText = (block: AcpContentBlock): string | undefined => {
  switch (block.type) {
    case "text":
      return block.text;
    case "resource":
      return "text" in block.resource ? block.resource.text : undefined;
    case "resource_link":
      return `[${block.name}](${block.uri})`;
    default:
      return undefined;
  }
};

const asBlockArray = (raw: unknown): readonly AcpContentBlock[] => {
  if (Array.isArray(raw)) return raw as readonly AcpContentBlock[];
  if (raw && typeof raw === "object") return [raw as AcpContentBlock];
  return [];
};

export function toolCallContentToText(
  content: readonly AcpToolCallContent[] | null | undefined,
): string | undefined {
  if (!content || content.length === 0) return undefined;
  const pieces: string[] = [];
  for (const item of content) {
    if (item.type === "content") {
      for (const block of asBlockArray(item.content)) {
        const text = blockToText(block);
        if (text) pieces.push(text);
      }
    } else if (item.type === "diff") {
      pieces.push(`--- ${item.path}\n+++ ${item.path}\n${item.newText}`);
    }
  }
  return pieces.length > 0 ? pieces.join("\n") : undefined;
}

export function stopReasonToMessageStatus(
  stopReason: AcpStopReason,
): MessageStatus {
  switch (stopReason) {
    case "cancelled":
      return { type: "incomplete", reason: "cancelled" };
    case "max_tokens":
      return { type: "incomplete", reason: "length" };
    case "refusal":
    case "max_turn_requests":
      return { type: "incomplete", reason: "other" };
    default:
      return { type: "complete", reason: "stop" };
  }
}

const PERMISSION_KIND_TO_APPROVAL_KIND: Record<
  AcpPermissionOptionKind,
  ToolApprovalOptionKind
> = {
  allow_once: "allow-once",
  allow_always: "allow-always",
  reject_once: "reject-once",
  reject_always: "reject-always",
};

export function permissionOptionToApprovalOption(
  option: AcpPermissionOption,
): ToolApprovalOption {
  return {
    id: option.optionId,
    kind: PERMISSION_KIND_TO_APPROVAL_KIND[option.kind] ?? option.kind,
    label: option.name,
  };
}

export function isAllowKind(kind: AcpPermissionOptionKind): boolean {
  return kind === "allow_once" || kind === "allow_always";
}

export function isRejectKind(kind: AcpPermissionOptionKind): boolean {
  return kind === "reject_once" || kind === "reject_always";
}

export type AcpApprovalDecision = {
  readonly approvalId: string;
  readonly approved: boolean;
  readonly optionId?: string;
};

/**
 * An explicit `optionId` wins; otherwise the decision picks the first option
 * of the matching family. Never cross families — the agent supplies `options`,
 * so an `options[0]` fallback could turn a denial into a grant.
 */
export function resolvePermissionOutcome(
  request: AcpPermissionRequest,
  decision: AcpApprovalDecision,
): AcpPermissionOutcome {
  const matchesFamily = decision.approved ? isAllowKind : isRejectKind;
  const chosen =
    (decision.optionId
      ? request.options.find((o) => o.optionId === decision.optionId)
      : undefined) ?? request.options.find((o) => matchesFamily(o.kind));
  return chosen
    ? { outcome: "selected", optionId: chosen.optionId }
    : { outcome: "cancelled" };
}

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
};

/** Namespace this package uses on a part's `providerMetadata`. */
const ACP_METADATA_NAMESPACE = "acp";

/**
 * `toolName` is the key apps register tool UIs against, so it has to stay
 * stable for the life of a call: the protocol's programmatic `name` first,
 * then the `kind` enum, and only then the human-readable `title`.
 */
const toolNameOf = (update: AcpToolCallUpdate): string | undefined => {
  const name = update.name || update.kind || update.title;
  return name || undefined;
};

/**
 * The `title` a stable `toolName` was chosen over, plus the `kind` it may have
 * come from, so a renderer can still show the human-readable label.
 */
const toolMetadataOf = (
  update: AcpToolCallUpdate,
): ReadonlyJSONObject | undefined => {
  const meta: Record<string, string> = {};
  const title = update.title ?? undefined;
  const kind = update.kind ?? undefined;
  if (title !== undefined) meta.title = title;
  if (kind !== undefined) meta.kind = kind;
  return Object.keys(meta).length > 0 ? meta : undefined;
};

const settledResult = (
  update: AcpToolCallUpdate,
  previous: ToolCallMessagePart,
): unknown => {
  if (update.rawOutput !== undefined) return update.rawOutput;
  if (update.content != null) {
    return toolCallContentToText(update.content) ?? previous.result ?? null;
  }
  return previous.result ?? null;
};

export function buildToolCallPart(
  update: AcpToolCallUpdate,
  knownStatus?: AcpToolCallStatus | undefined,
): ToolCallMessagePart {
  const args = isRecord(update.rawInput)
    ? (update.rawInput as ReadonlyJSONObject)
    : {};
  const status = update.status ?? knownStatus ?? "pending";
  const metadata = toolMetadataOf(update);
  const part: ToolCallMessagePart = {
    type: "tool-call",
    toolCallId: update.toolCallId,
    toolName: toolNameOf(update) ?? "tool_call",
    args,
    argsText:
      update.rawInput !== undefined ? safeStringify(update.rawInput) : "",
    ...(metadata !== undefined && {
      providerMetadata: { [ACP_METADATA_NAMESPACE]: metadata },
    }),
  };
  if (!isSettled(status)) {
    if (update.rawOutput === undefined) return part;
    return { ...part, result: update.rawOutput, isPreliminary: true };
  }
  return {
    ...part,
    result: settledResult(update, part),
    isError: status === "failed",
  };
}

export function mergeToolCallPart(
  existing: ToolCallMessagePart,
  update: AcpToolCallUpdate,
  knownStatus?: AcpToolCallStatus | undefined,
): ToolCallMessagePart {
  let next = existing;
  const set = (patch: Partial<ToolCallMessagePart>) => {
    next = { ...next, ...patch };
  };

  const toolName = toolNameOf(update);
  if (toolName && toolName !== next.toolName) set({ toolName });

  const metadata = toolMetadataOf(update);
  if (metadata !== undefined) {
    const previous = next.providerMetadata?.[ACP_METADATA_NAMESPACE];
    if (
      previous?.title !== metadata.title ||
      previous?.kind !== metadata.kind
    ) {
      set({
        providerMetadata: {
          ...next.providerMetadata,
          [ACP_METADATA_NAMESPACE]: metadata,
        },
      });
    }
  }

  if (update.rawInput !== undefined) {
    const argsText = safeStringify(update.rawInput);
    if (argsText !== next.argsText) {
      set({
        args: isRecord(update.rawInput)
          ? (update.rawInput as ReadonlyJSONObject)
          : {},
        argsText,
      });
    }
  }

  const status = update.status ?? knownStatus ?? "pending";

  if (isSettled(status)) {
    const result = settledResult(update, next);
    const isError = status === "failed";
    if (
      result !== next.result ||
      isError !== (next.isError ?? false) ||
      next.isPreliminary
    ) {
      set({
        result,
        isError,
        ...(next.isPreliminary ? { isPreliminary: false } : undefined),
      });
    }
    return next;
  }

  if (update.rawOutput !== undefined) {
    if (update.rawOutput !== next.result) {
      set({ result: update.rawOutput, isPreliminary: true });
    }
    return next;
  }

  if (update.content != null) {
    const text = toolCallContentToText(update.content);
    if (text !== undefined && text !== next.result) {
      set({ result: text, isPreliminary: true });
    }
  }
  return next;
}

const findToolCallIndex = (
  content: readonly AssistantPart[],
  toolCallId: string,
): number => {
  for (let i = 0; i < content.length; i++) {
    const part = content[i]!;
    if (part.type === "tool-call" && part.toolCallId === toolCallId) return i;
  }
  return -1;
};

const replaceAt = (
  content: readonly AssistantPart[],
  index: number,
  part: AssistantPart,
): AssistantPart[] => {
  const next = content.slice();
  next[index] = part;
  return next;
};

export function applyToolCallUpdate(
  content: readonly AssistantPart[],
  update: AcpToolCallUpdate,
  knownStatus?: AcpToolCallStatus | undefined,
): readonly AssistantPart[] | undefined {
  const index = findToolCallIndex(content, update.toolCallId);
  if (index === -1) {
    return [...content, buildToolCallPart(update, knownStatus)];
  }
  const existing = content[index] as ToolCallMessagePart;
  const merged = mergeToolCallPart(existing, update, knownStatus);
  return merged === existing ? undefined : replaceAt(content, index, merged);
}

export function attachToolCallApproval(
  content: readonly AssistantPart[],
  update: AcpToolCallUpdate,
  approval: NonNullable<ToolCallMessagePart["approval"]>,
): readonly AssistantPart[] {
  const index = findToolCallIndex(content, update.toolCallId);
  if (index === -1) {
    return [
      ...content,
      { ...buildToolCallPart(update), approval } satisfies ToolCallMessagePart,
    ];
  }
  const existing = content[index] as ToolCallMessagePart;
  return replaceAt(content, index, { ...existing, approval });
}

export function resolveToolCallApproval(
  content: readonly AssistantPart[],
  approvalId: string,
  resolution: Pick<
    NonNullable<ToolCallMessagePart["approval"]>,
    "approved" | "optionId" | "resolution"
  >,
): readonly AssistantPart[] | undefined {
  for (let i = 0; i < content.length; i++) {
    const part = content[i]!;
    if (part.type !== "tool-call" || part.approval?.id !== approvalId) continue;
    return replaceAt(content, i, {
      ...part,
      approval: { ...part.approval, ...resolution },
    });
  }
  return undefined;
}

type MediaPart = TextMessagePart | ImageMessagePart | FileMessagePart;

const mediaPartsFromBlock = (block: AcpContentBlock): readonly MediaPart[] => {
  switch (block.type) {
    case "text":
      return block.text ? [{ type: "text", text: block.text }] : [];
    case "image":
      return [
        {
          type: "image",
          image: `data:${block.mimeType};base64,${block.data}`,
        },
      ];
    case "audio":
      return [{ type: "file", data: block.data, mimeType: block.mimeType }];
    case "resource_link":
      return [
        {
          type: "file",
          data: block.uri,
          mimeType: block.mimeType || "application/octet-stream",
          sourceType: "url",
          filename: block.name,
        },
      ];
    case "resource": {
      const resource = block.resource;
      if ("text" in resource) {
        return resource.text ? [{ type: "text", text: resource.text }] : [];
      }
      const mimeType = resource.mimeType || "application/octet-stream";
      if (mimeType.startsWith("image/")) {
        return [
          { type: "image", image: `data:${mimeType};base64,${resource.blob}` },
        ];
      }
      return [{ type: "file", data: resource.blob, mimeType }];
    }
    default:
      return [];
  }
};

const messagePartsFromBlock = (
  block: AcpContentBlock,
  kind: "text" | "reasoning",
): readonly AssistantPart[] => {
  if (kind === "text") return mediaPartsFromBlock(block);
  if (block.type === "text") {
    return block.text ? [{ type: "reasoning", text: block.text }] : [];
  }
  if (block.type === "resource" && "text" in block.resource) {
    return block.resource.text
      ? [{ type: "reasoning", text: block.resource.text }]
      : [];
  }
  return mediaPartsFromBlock(block);
};

export function appendContentBlock(
  content: readonly AssistantPart[],
  block: AcpContentBlock,
  kind: "text" | "reasoning",
): readonly AssistantPart[] | undefined {
  const parts = messagePartsFromBlock(block, kind);
  if (parts.length === 0) return undefined;
  if (parts.length === 1 && parts[0]!.type === kind) {
    const text = (parts[0] as { text: string }).text;
    const last = content[content.length - 1];
    if (last && last.type === kind) {
      return replaceAt(content, content.length - 1, {
        ...last,
        text: last.text + text,
      } as AssistantPart);
    }
  }
  return [...content, ...parts];
}

export function applySessionUpdateToContent(
  content: readonly AssistantPart[],
  update: { readonly sessionUpdate: string } & Partial<AcpToolCallUpdate> & {
      readonly content?: AcpContentBlock;
    },
  knownStatus?: AcpToolCallStatus | undefined,
): readonly AssistantPart[] | undefined {
  switch (update.sessionUpdate) {
    case "agent_message_chunk":
      return update.content
        ? appendContentBlock(content, update.content, "text")
        : undefined;
    case "agent_thought_chunk":
      return update.content
        ? appendContentBlock(content, update.content, "reasoning")
        : undefined;
    case "tool_call":
    case "tool_call_update":
      return typeof update.toolCallId === "string"
        ? applyToolCallUpdate(content, update as AcpToolCallUpdate, knownStatus)
        : undefined;
    default:
      return undefined;
  }
}
