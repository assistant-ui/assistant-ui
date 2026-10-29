"use client";

import type { ToolCallMessagePart } from "@assistant-ui/core";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import {
  ADK_REQUEST_CONFIRMATION,
  type AdkToolApproval,
} from "./adkToolApproval";
import type { AdkMessage, AdkMessageContentPart } from "./types";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "image"; image: string; filename?: string }
  | {
      type: "file";
      data: string;
      mimeType: string;
      filename?: string;
      sourceType?: "url";
    }
  | { type: "data"; name: string; data: unknown };

const contentToParts = (
  content: AdkMessage["content"],
  role: "user" | "assistant",
): ContentPart[] => {
  if (typeof content === "string")
    return [{ type: "text" as const, text: content }];
  if (!Array.isArray(content)) return [];

  return content
    .filter(
      (part): part is AdkMessageContentPart =>
        typeof part === "object" && part !== null,
    )
    .map((part): ContentPart | null => {
      switch (part.type) {
        case "text":
          return {
            type: "text",
            text: typeof part.text === "string" ? part.text : "",
          };
        case "reasoning":
          if (role === "user") return null;
          return {
            type: "reasoning",
            text: typeof part.text === "string" ? part.text : "",
          };
        case "image":
          if (
            typeof part.mimeType !== "string" ||
            typeof part.data !== "string"
          )
            return null;
          return {
            type: "image",
            image: `data:${part.mimeType};base64,${part.data}`,
            ...(part.filename != null && { filename: part.filename }),
          };
        case "image_url":
          if (typeof part.url !== "string") return null;
          return {
            type: "image",
            image: part.url,
            ...(part.filename != null && { filename: part.filename }),
          };
        case "file":
          if (
            typeof part.mimeType !== "string" ||
            typeof part.data !== "string"
          )
            return null;
          return {
            type: "file",
            data: part.data,
            mimeType: part.mimeType,
            ...(part.filename != null && { filename: part.filename }),
          };
        case "file_url":
          if (typeof part.url !== "string") return null;
          if (role === "user") {
            return {
              type: "file",
              data: part.url,
              mimeType: part.mimeType ?? "application/octet-stream",
              sourceType: "url",
              ...(part.filename != null && { filename: part.filename }),
            };
          }
          return {
            type: "data",
            name: "file_url",
            data: {
              url: part.url,
              ...(part.mimeType != null && { mimeType: part.mimeType }),
              ...(part.filename != null && { filename: part.filename }),
            },
          };
        case "code":
          return {
            type: "data",
            name: "executable_code",
            data: { code: part.code, language: part.language },
          };
        case "code_result":
          return {
            type: "data",
            name: "code_execution_result",
            data: { output: part.output, outcome: part.outcome },
          };
        case "activity":
          return {
            type: "text",
            text: typeof part.message === "string" ? part.message : "",
          };
        default:
          return null;
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
};

const EMPTY_APPROVALS: ReadonlyMap<string, AdkToolApproval> = new Map();

const decodeToolResult = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

export const createAdkMessageConverter = (
  approvals: ReadonlyMap<string, AdkToolApproval>,
  bufferedReplyIds: ReadonlySet<string> = new Set(),
): useExternalMessageConverter.Callback<AdkMessage> => {
  const confirmationIdsWithGatedCalls = new Set(
    [...approvals].flatMap(([toolCallId, approval]) =>
      toolCallId === approval.id ? [] : [approval.id],
    ),
  );

  return (message) => {
    switch (message.type) {
      case "human":
        return {
          role: "user",
          id: message.id,
          content: contentToParts(message.content, "user"),
        };

      case "ai": {
        const contentParts = contentToParts(message.content, "assistant");
        const toolCallParts: ToolCallMessagePart[] =
          message.tool_calls?.flatMap((tc) => {
            if (typeof tc?.name !== "string" || tc.name.length === 0) return [];
            if (
              tc.name === ADK_REQUEST_CONFIRMATION &&
              confirmationIdsWithGatedCalls.has(tc.id)
            )
              return [];
            const approval = approvals.get(tc.id);
            return {
              type: "tool-call",
              toolCallId: tc.id,
              toolName: tc.name,
              args: tc.args,
              argsText: tc.argsText ?? JSON.stringify(tc.args),
              ...(approval && { approval }),
              ...((bufferedReplyIds.has(tc.id) ||
                (approval && bufferedReplyIds.has(approval.id))) && {
                responseDeliveryStatus: "queued" as const,
              }),
            };
          }) ?? [];

        if (
          contentParts.length === 0 &&
          toolCallParts.length === 0 &&
          message.tool_calls !== undefined &&
          message.tool_calls.length > 0 &&
          message.tool_calls.every(
            (tc) =>
              tc?.name === ADK_REQUEST_CONFIRMATION &&
              confirmationIdsWithGatedCalls.has(tc.id),
          )
        )
          return [];

        return {
          role: "assistant",
          id: message.id,
          content: [...contentParts, ...toolCallParts],
          ...(message.status && { status: message.status }),
          ...(message.author && {
            metadata: {
              custom: { author: message.author, branch: message.branch },
            },
          }),
        };
      }

      case "tool": {
        // A confirmation reply ADK could not read leaves its gate undecided.
        // The reply is not the agent's output, so it is dropped rather than
        // shown as the call's result while the gate waits to be answered again.
        // Only a reply to the confirmation itself is dropped: the gated call
        // carries the same approval, and its own result is the agent's real
        // output.
        const approval = approvals.get(message.tool_call_id);
        if (
          message.name === ADK_REQUEST_CONFIRMATION &&
          approval !== undefined &&
          approval.approved === undefined
        )
          return [];

        return {
          role: "tool",
          toolCallId: message.tool_call_id,
          toolName: message.name,
          result: decodeToolResult(message.content),
          isError: message.status === "error",
        };
      }

      default:
        message satisfies never;
        return [];
    }
  };
};

export const convertAdkMessage: useExternalMessageConverter.Callback<AdkMessage> =
  createAdkMessageConverter(EMPTY_APPROVALS);
