"use client";

import type {
  MessageStatus,
  ThreadAssistantMessage,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  parseDataUrl,
  resolveFilePartSource,
} from "@assistant-ui/core/internal";
import type { A2AMessage, A2APart, A2ATaskState } from "./types";

function isImageMediaType(mediaType?: string): boolean {
  return !!mediaType && mediaType.startsWith("image/");
}

const A2UI_OPERATION_KEYS = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isA2uiOperation = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.version === "string" &&
  A2UI_OPERATION_KEYS.some((key) => Object.hasOwn(value, key));

const hasA2uiMediaType = (value: unknown): boolean =>
  typeof value === "string" && value.toLowerCase().includes("a2ui");

export function isA2uiDataPart(part: A2APart): boolean {
  if (part.data === undefined) return false;

  const metadata = isRecord(part.metadata) ? part.metadata : {};
  return (
    hasA2uiMediaType(part.mediaType) ||
    hasA2uiMediaType(metadata.mimeType) ||
    hasA2uiMediaType(metadata.mediaType) ||
    isA2uiOperation(part.data) ||
    (Array.isArray(part.data) &&
      part.data.length > 0 &&
      part.data.every(isA2uiOperation))
  );
}

export function a2uiPartToOperations(part: A2APart): readonly unknown[] {
  if (!isA2uiDataPart(part)) return [];
  return Array.isArray(part.data) ? part.data : [part.data];
}

export function a2uiPartsToOperations(
  parts: readonly A2APart[],
): readonly unknown[] {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap(a2uiPartToOperations);
}

export function a2aPartToContent(
  part: A2APart,
): ThreadAssistantMessage["content"][number] {
  if (part.text != null) {
    return { type: "text", text: part.text };
  }
  if (part.url != null) {
    if (isImageMediaType(part.mediaType)) {
      return {
        type: "image",
        image: part.url,
        ...(part.filename && { filename: part.filename }),
      };
    }
    return {
      type: "file",
      data: part.url,
      mimeType: part.mediaType ?? "application/octet-stream",
      sourceType: "url",
      ...(part.filename && { filename: part.filename }),
    };
  }
  if (part.raw != null) {
    if (isImageMediaType(part.mediaType)) {
      return {
        type: "image",
        image: `data:${part.mediaType};base64,${part.raw}`,
        ...(part.filename && { filename: part.filename }),
      };
    }
    return {
      type: "file",
      data: part.raw,
      mimeType: part.mediaType ?? "application/octet-stream",
      ...(part.filename && { filename: part.filename }),
    };
  }
  if (part.data !== undefined) {
    return { type: "text", text: JSON.stringify(part.data, null, 2) };
  }
  return { type: "text", text: "" };
}

export function a2aPartsToContent(
  parts: A2APart[],
): ThreadAssistantMessage["content"] {
  return (Array.isArray(parts) ? parts : [])
    .filter((part) => isRecord(part) && !isA2uiDataPart(part))
    .map(a2aPartToContent);
}

const TERMINAL_STATES = new Set<A2ATaskState>([
  "completed",
  "failed",
  "canceled",
  "rejected",
]);

const INTERRUPTED_STATES = new Set<A2ATaskState>([
  "input_required",
  "auth_required",
]);

export function isTerminalTaskState(state: A2ATaskState): boolean {
  return TERMINAL_STATES.has(state);
}

export function isInterruptedTaskState(state: A2ATaskState): boolean {
  return INTERRUPTED_STATES.has(state);
}

export function taskStateToMessageStatus(state: A2ATaskState): MessageStatus {
  switch (state) {
    case "submitted":
    case "working":
      return { type: "running" };
    case "completed":
      return { type: "complete", reason: "stop" };
    case "failed":
    case "rejected":
      return { type: "incomplete", reason: "error" };
    case "canceled":
      return { type: "incomplete", reason: "cancelled" };
    case "input_required":
    case "auth_required":
      return { type: "requires-action", reason: "interrupt" };
    default:
      return { type: "running" };
  }
}

export function contentPartsToA2AParts(
  content: ReadonlyArray<{
    type: string;
    text?: string | undefined;
    image?: string | undefined;
    data?: unknown;
    mimeType?: string | undefined;
    filename?: string | undefined;
    sourceType?: "url" | "id" | undefined;
    audio?: { data: string; format: string } | undefined;
  }>,
  fallbackMimeType?: string,
): A2APart[] {
  return content
    .map((part): A2APart | null => {
      switch (part.type) {
        case "text":
          return { text: part.text ?? "" };
        case "image": {
          if (!part.image) return null;
          const parsed = parseDataUrl(part.image);
          if (parsed) {
            return {
              raw: parsed.data,
              mediaType: parsed.mimeType,
              ...(part.filename && { filename: part.filename }),
            };
          }
          return {
            url: part.image,
            ...(fallbackMimeType && { mediaType: fallbackMimeType }),
            ...(part.filename && { filename: part.filename }),
          };
        }
        case "file": {
          if (typeof part.data !== "string") return null;
          const declaredMimeType = part.mimeType || fallbackMimeType;
          const source = resolveFilePartSource({
            data: part.data,
            mimeType: declaredMimeType ?? "application/octet-stream",
            sourceType: part.sourceType,
          });
          if (source.kind === "url") {
            return {
              url: source.url,
              ...(declaredMimeType && { mediaType: declaredMimeType }),
              ...(part.filename && { filename: part.filename }),
            };
          }
          const parsed = parseDataUrl(part.data);
          if (parsed) {
            return {
              raw: source.data,
              mediaType: source.mimeType,
              ...(part.filename && { filename: part.filename }),
            };
          }
          if (/^data:/i.test(part.data)) {
            return {
              url: part.data,
              ...(declaredMimeType && { mediaType: declaredMimeType }),
              ...(part.filename && { filename: part.filename }),
            };
          }
          return {
            raw: source.data,
            ...(declaredMimeType && { mediaType: declaredMimeType }),
            ...(part.filename && { filename: part.filename }),
          };
        }
        case "audio": {
          if (!part.audio) return null;
          return {
            raw: parseDataUrl(part.audio.data)?.data ?? part.audio.data,
            mediaType: `audio/${part.audio.format}`,
          };
        }
        case "data": {
          if (part.data === undefined) return null;
          return { data: part.data };
        }
        default:
          return null;
      }
    })
    .filter((p): p is A2APart => p !== null);
}

export function a2aMessageToContent(
  message: A2AMessage,
): ThreadAssistantMessage["content"] {
  return a2aPartsToContent(message?.parts ?? []);
}

export function threadMessageToA2AMessage(
  message: ThreadMessage,
  options: {
    contextId?: string | undefined;
    taskId?: string | undefined;
  } = {},
): A2AMessage {
  const parts: A2APart[] = [];

  if (message.role === "user") {
    parts.push(...contentPartsToA2AParts(message.content));
    for (const attachment of message.attachments ?? []) {
      parts.push(
        ...contentPartsToA2AParts(
          attachment.content ?? [],
          attachment.contentType,
        ),
      );
    }
  }

  const a2aMsg: A2AMessage = {
    messageId: message.id,
    role: "user",
    parts,
  };

  if (options.contextId) {
    a2aMsg.contextId = options.contextId;
  }
  if (options.taskId) {
    a2aMsg.taskId = options.taskId;
  }

  return a2aMsg;
}
