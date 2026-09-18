"use client";

import type {
  MessagePartStatus,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import { isRecord, parseDataUrl } from "@assistant-ui/core/internal";
import type {
  AcpContentBlock,
  AcpPermissionOption,
  AcpStopReason,
  AcpToolCallContent,
  AcpToolCallStatus,
  AcpToolCallUpdate,
} from "./types";

// ---------------------------------------------------------------------------
// User content -> ACP content blocks
// ---------------------------------------------------------------------------

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
        if (parsed) {
          blocks.push({
            type: "image",
            data: parsed.data,
            mimeType: parsed.mimeType,
          });
        } else {
          blocks.push({ type: "resource", resource: { uri: part.image } });
        }
        break;
      }
      case "file": {
        if (part.sourceType === "url") {
          blocks.push({
            type: "resource",
            resource: { uri: part.data, mimeType: part.mimeType },
          });
          break;
        }
        const parsed = parseDataUrl(part.data);
        if (parsed) {
          blocks.push({
            type: "resource",
            resource: {
              uri: `file:///${part.filename ?? "attachment"}`,
              mimeType: parsed.mimeType,
              blob: parsed.data,
            },
          });
        }
        break;
      }
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// ACP tool call content -> display text
// ---------------------------------------------------------------------------

export function toolCallContentToText(
  content: readonly AcpToolCallContent[] | undefined,
): string | undefined {
  if (!content || content.length === 0) return undefined;
  const pieces: string[] = [];
  for (const item of content) {
    if (item.type === "content") {
      // The spec says ContentBlock[], but some agents (e.g. crow-cli) send a
      // single block object instead — accept both rather than throwing.
      const raw = item.content as unknown;
      const blocks: readonly AcpContentBlock[] = Array.isArray(raw)
        ? (raw as readonly AcpContentBlock[])
        : raw
          ? [raw as AcpContentBlock]
          : [];
      for (const block of blocks) {
        if (block.type === "text") pieces.push(block.text);
        else if (block.type === "resource" && block.resource.text != null)
          pieces.push(block.resource.text);
      }
    } else if (item.type === "diff") {
      pieces.push(`--- ${item.path}\n+++ ${item.path}\n${item.newText}`);
    }
  }
  return pieces.length > 0 ? pieces.join("\n") : undefined;
}

// ---------------------------------------------------------------------------
// Status mappings
// ---------------------------------------------------------------------------

export function stopReasonToMessageStatus(
  stopReason: AcpStopReason,
): MessageStatus {
  switch (stopReason) {
    case "cancelled":
      return { type: "incomplete", reason: "cancelled" };
    case "refusal":
      return { type: "incomplete", reason: "other" };
    case "max_tokens":
      return { type: "incomplete", reason: "length" };
    default:
      return { type: "complete", reason: "stop" };
  }
}

export function acpToolStatusToPartStatus(
  status: AcpToolCallStatus,
): MessagePartStatus {
  switch (status) {
    case "completed":
      return { type: "complete" };
    case "failed":
      return { type: "incomplete", reason: "error" };
    default:
      return { type: "running" };
  }
}

const PERMISSION_KIND_TO_APPROVAL_KIND: Record<
  AcpPermissionOption["kind"],
  string
> = {
  allow_once: "allow-once",
  allow_always: "allow-always",
  reject_once: "reject-once",
  reject_always: "reject-always",
};

export function permissionOptionToApprovalOption(option: AcpPermissionOption): {
  id: string;
  kind: string;
  label: string;
  description?: string;
} {
  return {
    id: option.optionId,
    kind: PERMISSION_KIND_TO_APPROVAL_KIND[option.kind] ?? option.kind,
    label: option.name,
    ...(option.description != null && { description: option.description }),
  };
}

export function isAllowKind(kind: AcpPermissionOption["kind"]): boolean {
  return kind === "allow_once" || kind === "allow_always";
}

// ---------------------------------------------------------------------------
// Run accumulator: ACP session updates -> assistant message content
// ---------------------------------------------------------------------------

export class AcpContentAccumulator {
  private _content: ThreadAssistantMessage["content"] = [];
  private readonly toolCallIndexes = new Map<string, number>();

  get content(): ThreadAssistantMessage["content"] {
    return this._content;
  }

  /** Consume one session update. Returns true when content changed. */
  consume(
    update: {
      sessionUpdate: string;
      content?: AcpContentBlock;
    } & Partial<AcpToolCallUpdate>,
  ): boolean {
    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        return update.content
          ? this.appendChunk(update.content, "text")
          : false;
      case "agent_thought_chunk":
        return update.content
          ? this.appendChunk(update.content, "reasoning")
          : false;
      case "tool_call":
      case "tool_call_update":
        return this.upsertToolCall(update as AcpToolCallUpdate);
      default:
        return false;
    }
  }

  /** Attach an approval request to a tool-call part (creates it if needed). */
  attachApproval(
    toolCall: AcpToolCallUpdate,
    approval: ToolCallMessagePart["approval"],
  ): boolean {
    const idx = this.toolCallIndexes.get(toolCall.toolCallId);
    if (idx === undefined) {
      this.upsertToolCall(toolCall);
      return this.attachApproval(toolCall, approval);
    }
    const existing = this._content[idx] as ToolCallMessagePart;
    const merged: ToolCallMessagePart = { ...existing, approval };
    this.replaceAt(idx, merged);
    return true;
  }

  /** Record an approval resolution on a tool-call part. */
  resolveApproval(
    approvalId: string,
    resolution: { approved: boolean; optionId?: string },
  ): boolean {
    const idx = this._content.findIndex(
      (part) => part.type === "tool-call" && part.approval?.id === approvalId,
    );
    if (idx < 0) return false;
    const existing = this._content[idx] as ToolCallMessagePart;
    if (!existing.approval) return false;
    const merged: ToolCallMessagePart = {
      ...existing,
      approval: { ...existing.approval, ...resolution },
    };
    this.replaceAt(idx, merged);
    return true;
  }

  private replaceAt(
    index: number,
    part: ThreadAssistantMessage["content"][number],
  ) {
    this._content = [
      ...this._content.slice(0, index),
      part,
      ...this._content.slice(index + 1),
    ];
  }

  private appendChunk(
    block: AcpContentBlock,
    kind: "text" | "reasoning",
  ): boolean {
    if (block.type === "text") {
      const last = this._content[this._content.length - 1];
      if (last && last.type === kind) {
        this.replaceAt(this._content.length - 1, {
          ...last,
          text: last.text + block.text,
        });
      } else {
        this._content = [...this._content, { type: kind, text: block.text }];
      }
      return true;
    }
    if (block.type === "image") {
      this._content = [
        ...this._content,
        {
          type: "image",
          image: `data:${block.mimeType};base64,${block.data}`,
        },
      ];
      return true;
    }
    if (block.type === "resource" && block.resource.text != null) {
      return this.appendChunk(
        { type: "text", text: block.resource.text },
        kind,
      );
    }
    return false;
  }

  private upsertToolCall(update: AcpToolCallUpdate): boolean {
    const existingIdx = this.toolCallIndexes.get(update.toolCallId);
    if (existingIdx === undefined) {
      const part = this.buildToolCallPart(update);
      this.toolCallIndexes.set(update.toolCallId, this._content.length);
      this._content = [...this._content, part];
      return true;
    }

    const existing = this._content[existingIdx] as ToolCallMessagePart;
    const merged = this.mergeToolCallPart(existing, update);
    if (merged === existing) return false;
    this.replaceAt(existingIdx, merged);
    return true;
  }

  private buildToolCallPart(update: AcpToolCallUpdate): ToolCallMessagePart {
    const args = isRecord(update.rawInput) ? update.rawInput : {};
    const status = update.status ?? "pending";
    const result =
      update.rawOutput ??
      (status === "completed" || status === "failed"
        ? toolCallContentToText(update.content)
        : undefined);
    return {
      type: "tool-call",
      toolCallId: update.toolCallId,
      toolName: update.title || update.kind || "tool_call",
      args,
      argsText: update.rawInput != null ? safeStringify(update.rawInput) : "",
      ...(result !== undefined && { result }),
      ...(status === "failed" && { isError: true }),
      status: acpToolStatusToPartStatus(status),
    };
  }

  private mergeToolCallPart(
    existing: ToolCallMessagePart,
    update: AcpToolCallUpdate,
  ): ToolCallMessagePart {
    let next = existing;
    let changed = false;
    const set = (patch: Partial<ToolCallMessagePart>) => {
      next = { ...next, ...patch };
      changed = true;
    };

    if (update.title != null && update.title !== existing.toolName) {
      set({ toolName: update.title });
    }
    if (update.rawInput !== undefined) {
      set({
        args: isRecord(update.rawInput) ? update.rawInput : {},
        argsText: safeStringify(update.rawInput),
      });
    }
    if (
      update.rawOutput !== undefined &&
      update.rawOutput !== existing.result
    ) {
      set({ result: update.rawOutput });
    }
    if (update.status != null) {
      const partStatus = acpToolStatusToPartStatus(update.status);
      if (
        partStatus.type !== existing.status?.type ||
        (partStatus.type === "incomplete" &&
          existing.status?.type === "incomplete" &&
          partStatus.reason !== existing.status.reason)
      ) {
        set({
          status: partStatus,
          ...(update.status === "failed" && { isError: true }),
        });
      }
      if (
        (update.status === "completed" || update.status === "failed") &&
        next.result === undefined
      ) {
        const text = toolCallContentToText(update.content);
        if (text !== undefined) set({ result: text });
      }
    } else if (update.content != null && next.result === undefined) {
      const text = toolCallContentToText(update.content);
      if (text !== undefined) set({ result: text });
    }

    return changed ? next : existing;
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}
