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
  resolveImageMediaType,
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
  AcpToolCallLocation,
  AcpToolCallStatus,
  AcpToolCallUpdate,
} from "./types";

type AssistantPart = ThreadAssistantMessage["content"][number];

const isSettled = (status: AcpToolCallStatus) =>
  status === "completed" || status === "failed";

const resourceOf = (block: AcpEmbeddedResourceContentBlock) =>
  isRecord(block.resource) ? block.resource : undefined;

export function threadContentToAcpBlocks(
  content: ThreadUserMessage["content"],
  contentType?: string,
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
            ? {
                type: "image",
                data: parsed.data,
                mimeType: resolveImageMediaType(part.image, contentType),
              }
            : {
                type: "resource_link",
                uri: part.image,
                name: part.filename || part.image,
                ...(contentType?.startsWith("image/")
                  ? { mimeType: resolveImageMediaType(part.image, contentType) }
                  : undefined),
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
            uri: `file:///${encodeURIComponent(part.filename ?? "attachment")}`,
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

const resourceLinkOf = (uri: string, mimeType: string | null | undefined) =>
  ({
    type: "resource_link",
    uri,
    name: uri,
    ...(mimeType ? { mimeType } : undefined),
  }) satisfies AcpResourceLinkContentBlock;

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
        const resource = resourceOf(block);
        if (resource && "text" in resource)
          kept.push({ type: "text", text: resource.text });
        else if (resource && isAgentRetrievable(resource.uri))
          kept.push(resourceLinkOf(resource.uri, resource.mimeType));
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
    case "resource": {
      const resource = resourceOf(block);
      return resource && "text" in resource ? resource.text : undefined;
    }
    case "resource_link":
      return `[${block.name}](${block.uri})`;
    default:
      return undefined;
  }
};

const asBlockArray = (raw: unknown): readonly AcpContentBlock[] => {
  if (Array.isArray(raw)) return raw.filter(isRecord) as AcpContentBlock[];
  if (isRecord(raw)) return [raw as AcpContentBlock];
  return [];
};

export function toolCallContentToText(
  content: readonly AcpToolCallContent[] | null | undefined,
): string | undefined {
  if (!Array.isArray(content) || content.length === 0) return undefined;
  const pieces: string[] = [];
  for (const item of content as readonly unknown[]) {
    if (!isRecord(item)) continue;
    if (item.type === "content") {
      for (const block of asBlockArray(item.content)) {
        const text = blockToText(block);
        if (text) pieces.push(text);
      }
    } else if (item.type === "diff" && typeof item.path === "string") {
      pieces.push(
        `--- ${item.path}\n+++ ${item.path}\n${String(item.newText)}`,
      );
    }
  }
  return pieces.length > 0 ? pieces.join("\n") : undefined;
}

export function stopReasonToMessageStatus(
  stopReason: AcpStopReason,
): MessageStatus {
  switch (stopReason) {
    case "end_turn":
      return { type: "complete", reason: "stop" };
    case "cancelled":
      return { type: "incomplete", reason: "cancelled" };
    case "max_tokens":
      return { type: "incomplete", reason: "length" };
    case "refusal":
      return { type: "incomplete", reason: "content-filter" };
    case "max_turn_requests":
      return { type: "incomplete", reason: "other" };
    default:
      return { type: "complete", reason: "unknown" };
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
 * The one-time option of a family before its standing one, whatever order the
 * agent listed them in: a plain approve or deny consents to this call only.
 */
export function preferredPermissionOption(
  options: readonly AcpPermissionOption[],
  approved: boolean,
): AcpPermissionOption | undefined {
  const [once, always] = approved
    ? (["allow_once", "allow_always"] as const)
    : (["reject_once", "reject_always"] as const);
  return (
    options.find((o) => o.kind === once) ??
    options.find((o) => o.kind === always)
  );
}

/**
 * An explicit `optionId` wins; otherwise the decision picks within its own
 * family. Never cross families: the agent supplies `options`, so an
 * `options[0]` fallback could turn a denial into a grant.
 */
export function resolvePermissionOutcome(
  request: AcpPermissionRequest,
  decision: AcpApprovalDecision,
): AcpPermissionOutcome {
  const chosen =
    (decision.optionId
      ? request.options.find((o) => o.optionId === decision.optionId)
      : undefined) ??
    preferredPermissionOption(request.options, decision.approved);
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
 * What the agent has reported about a call, accumulated across its updates and
 * kept on the part as `providerMetadata.acp`. A `tool_call_update` carries only
 * what changed: an omitted or `null` field leaves the earlier value in place,
 * so a later frame cannot drop one an earlier frame reported.
 */
type AcpToolCallMetadata = {
  readonly name?: string;
  readonly kind?: string;
  readonly title?: string;
  readonly status?: AcpToolCallStatus;
  readonly locations?: readonly {
    readonly path: string;
    readonly line?: number;
  }[];
};

const locationsOf = (locations: readonly AcpToolCallLocation[]) =>
  locations.map(({ path, line }) => ({ path, ...(line != null && { line }) }));

const metadataOf = (
  part: ToolCallMessagePart,
): AcpToolCallMetadata | undefined =>
  part.providerMetadata?.[ACP_METADATA_NAMESPACE] as
    | AcpToolCallMetadata
    | undefined;

const mergedMetadataOf = (
  update: AcpToolCallUpdate,
  previous: AcpToolCallMetadata | undefined,
): AcpToolCallMetadata => {
  const name = update.name ?? previous?.name;
  const kind = update.kind ?? previous?.kind;
  const title = update.title ?? previous?.title;
  const status = update.status ?? previous?.status;
  const locations = update.locations
    ? locationsOf(update.locations)
    : previous?.locations;
  return {
    ...(name !== undefined && { name }),
    ...(kind !== undefined && { kind }),
    ...(title !== undefined && { title }),
    ...(status !== undefined && { status }),
    ...(locations !== undefined && { locations }),
  };
};

const sameMetadata = (
  metadata: AcpToolCallMetadata,
  previous: AcpToolCallMetadata | undefined,
): boolean =>
  metadata.name === previous?.name &&
  metadata.kind === previous?.kind &&
  metadata.title === previous?.title &&
  metadata.status === previous?.status &&
  metadata.locations === previous?.locations;

/**
 * `toolName` is the key apps register tool UIs against, so it has to stay
 * stable for the life of a call: the protocol's programmatic `name` first,
 * then the `kind` enum, and only then the human-readable `title`.
 */
const toolNameOf = (metadata: AcpToolCallMetadata): string | undefined => {
  const name = metadata.name || metadata.kind || metadata.title;
  return name || undefined;
};

const withoutResult = ({
  result: _result,
  isError: _isError,
  isPreliminary: _isPreliminary,
  ...part
}: ToolCallMessagePart): ToolCallMessagePart => part;

/**
 * A settled call's result is its `rawOutput`, else the text of the `content`
 * collection the update replaced, else what an earlier frame reported.
 */
const settledResult = (
  update: AcpToolCallUpdate,
  previous: ToolCallMessagePart,
): unknown => {
  if (update.rawOutput !== undefined) return update.rawOutput;
  if (update.content != null) {
    return toolCallContentToText(update.content) ?? null;
  }
  return previous.result ?? null;
};

export function buildToolCallPart(
  update: AcpToolCallUpdate,
): ToolCallMessagePart {
  const metadata = mergedMetadataOf(update, undefined);
  const part: ToolCallMessagePart = {
    type: "tool-call",
    toolCallId: update.toolCallId,
    toolName: toolNameOf(metadata) ?? "tool_call",
    args: isRecord(update.rawInput)
      ? (update.rawInput as ReadonlyJSONObject)
      : {},
    argsText:
      update.rawInput !== undefined ? safeStringify(update.rawInput) : "",
    ...(Object.keys(metadata).length > 0 && {
      providerMetadata: { [ACP_METADATA_NAMESPACE]: metadata },
    }),
  };
  const status = update.status ?? "pending";
  if (!isSettled(status)) {
    const preliminary =
      update.rawOutput !== undefined
        ? update.rawOutput
        : toolCallContentToText(update.content);
    return preliminary === undefined
      ? part
      : { ...part, result: preliminary, isPreliminary: true };
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
): ToolCallMessagePart {
  let next = existing;
  const set = (patch: Partial<ToolCallMessagePart>) => {
    next = { ...next, ...patch };
  };

  const previous = metadataOf(existing);
  const metadata = mergedMetadataOf(update, previous);
  const toolName = toolNameOf(metadata);
  if (toolName && toolName !== next.toolName) set({ toolName });
  if (!sameMetadata(metadata, previous)) {
    set({
      providerMetadata: {
        ...next.providerMetadata,
        [ACP_METADATA_NAMESPACE]: metadata,
      },
    });
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

  const status = metadata.status ?? "pending";
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

  // A call reported running again after it settled is being retried.
  if (next.result !== undefined && !next.isPreliminary) {
    next = withoutResult(next);
  }
  const preliminary =
    update.rawOutput !== undefined
      ? update.rawOutput
      : update.content != null
        ? (toolCallContentToText(update.content) ?? null)
        : undefined;
  if (preliminary === null) {
    if (next.result !== undefined) next = withoutResult(next);
  } else if (preliminary !== undefined && preliminary !== next.result) {
    set({ result: preliminary, isPreliminary: true });
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
): readonly AssistantPart[] | undefined {
  const index = findToolCallIndex(content, update.toolCallId);
  if (index === -1) {
    return [...content, buildToolCallPart(update)];
  }
  const existing = content[index] as ToolCallMessagePart;
  const merged = mergeToolCallPart(existing, update);
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
      if (block.mimeType?.startsWith("image/")) {
        return [{ type: "image", image: block.uri, filename: block.name }];
      }
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
      const resource = resourceOf(block);
      if (!resource) return [];
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
  if (block.type === "resource") {
    const resource = resourceOf(block);
    if (resource && "text" in resource) {
      return resource.text ? [{ type: "reasoning", text: resource.text }] : [];
    }
  }
  return mediaPartsFromBlock(block);
};

export function appendContentBlock(
  content: readonly AssistantPart[],
  block: AcpContentBlock,
  kind: "text" | "reasoning",
): readonly AssistantPart[] | undefined {
  if (!isRecord(block)) return undefined;
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
