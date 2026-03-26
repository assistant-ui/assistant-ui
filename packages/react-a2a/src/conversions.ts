"use client";

import type { MessageStatus, ThreadAssistantMessage } from "@assistant-ui/core";
import type { A2AMessage, A2APart, A2ATaskState } from "./types";

function isImageMediaType(mediaType?: string): boolean {
  return !!mediaType && mediaType.startsWith("image/");
}

export function a2aPartToContent(
  part: A2APart,
): ThreadAssistantMessage["content"][number] {
  if (part.text !== undefined) {
    return { type: "text", text: part.text };
  }
  if (part.url !== undefined) {
    if (isImageMediaType(part.mediaType)) {
      return { type: "image", image: part.url };
    }
    return {
      type: "text",
      text: part.filename ? `[${part.filename}](${part.url})` : part.url,
    };
  }
  if (part.raw !== undefined) {
    if (isImageMediaType(part.mediaType)) {
      return {
        type: "image",
        image: `data:${part.mediaType};base64,${part.raw}`,
      };
    }
    return {
      type: "text",
      text: `[File: ${part.filename ?? "download"}]`,
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
  return parts.map(a2aPartToContent);
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
    text?: string;
    image?: string;
  }>,
): A2APart[] {
  return content
    .map((part): A2APart | null => {
      switch (part.type) {
        case "text":
          return { text: part.text ?? "" };
        case "image":
          if (!part.image) return null;
          return { url: part.image, mediaType: "image/*" };
        default:
          return null;
      }
    })
    .filter((p): p is A2APart => p !== null);
}

export function a2aMessageToContent(
  message: A2AMessage,
): ThreadAssistantMessage["content"] {
  return a2aPartsToContent(message.parts);
}
