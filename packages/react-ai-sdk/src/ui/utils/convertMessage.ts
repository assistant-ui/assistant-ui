import { isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type DataMessagePart,
  type SourceMessagePart,
  type useExternalMessageConverter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

type MessageMetadata = ThreadMessageLike["metadata"];

function stripClosingDelimiters(json: string): string {
  return json.replace(/[}\]"]+$/, "");
}

/**
 * Resolves the interrupt fields for a tool call part.
 *
 * Two interrupt paths for tool approvals:
 * 1. AI SDK server-side approval: approval-requested state with part.approval payload
 * 2. Frontend tools: toolStatuses interrupt from context.human()
 */
function getToolInterrupt(
  part: { state: string; approval?: unknown },
  toolStatus: { type: string; payload?: unknown } | undefined,
): Record<string, unknown> {
  if (part.state === "approval-requested" && "approval" in part) {
    return {
      interrupt: {
        type: "human" as const,
        payload: (part as { approval: unknown }).approval,
      },
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  if (toolStatus?.type === "interrupt") {
    return {
      interrupt: toolStatus.payload,
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
    };
  }

  return {};
}

type MessageContent = Exclude<ThreadMessageLike["content"], string>;

function convertParts(
  message: UIMessage,
  metadata: useExternalMessageConverter.Metadata,
): MessageContent {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  const converted = message.parts
    .filter((p) => p.type !== "step-start" && p.type !== "file")
    .map((part) => {
      if (part.type === "text") {
        return {
          type: "text",
          text: part.text,
        } satisfies TextMessagePart;
      }

      if (part.type === "reasoning") {
        return {
          type: "reasoning",
          text: part.text,
        } satisfies ReasoningMessagePart;
      }

      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        const toolCallId = part.toolCallId;
        const args: ReadonlyJSONObject =
          (part.input as ReadonlyJSONObject) || {};

        let result: unknown;
        let isError = false;

        if (part.state === "output-available") {
          result = part.output;
        } else if (part.state === "output-error") {
          isError = true;
          result = { error: part.errorText };
        } else if (part.state === "output-denied") {
          isError = true;
          result = {
            error:
              (part as { approval: { reason?: string } }).approval.reason ||
              "Tool approval denied",
          };
        }

        let argsText = JSON.stringify(args);
        if (part.state === "input-streaming") {
          // strip closing delimiters added by the AI SDK's fix-json
          argsText = stripClosingDelimiters(argsText);
        }

        const toolStatus = metadata.toolStatuses?.[toolCallId];
        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText,
          args,
          result,
          isError,
          ...getToolInterrupt(part, toolStatus),
        } satisfies ToolCallMessagePart;
      }

      if (part.type === "source-url") {
        return {
          type: "source",
          sourceType: "url",
          id: part.sourceId,
          url: part.url,
          title: part.title || "",
        } satisfies SourceMessagePart;
      }

      if (part.type === "source-document") {
        console.warn(
          "Source document parts are not yet supported in conversion",
        );
        return null;
      }

      if (part.type.startsWith("data-")) {
        return {
          type: part.type,
          name: part.type.substring(5),
          data: (part as any).data,
        } satisfies DataMessagePart;
      }

      console.warn(`Unsupported message part type: ${part.type}`);
      return null;
    })
    .filter(Boolean) as MessageContent[number][];

  const seenToolCallIds = new Set<string>();
  return converted.filter((part) => {
    if (part.type === "tool-call" && part.toolCallId != null) {
      if (seenToolCallIds.has(part.toolCallId)) return false;
      seenToolCallIds.add(part.toolCallId);
    }
    return true;
  });
}

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: UIMessage, metadata: useExternalMessageConverter.Metadata) => {
    const createdAt = new Date();
    const content = convertParts(message, metadata);

    switch (message.role) {
      case "user":
        return {
          role: "user",
          id: message.id,
          createdAt,
          content,
          attachments: message.parts
            ?.filter((p) => p.type === "file")
            .map((part, idx) => ({
              id: idx.toString(),
              type: part.mediaType.startsWith("image/") ? "image" : "file",
              name: part.filename ?? "file",
              content: [
                part.mediaType.startsWith("image/")
                  ? {
                      type: "image",
                      image: part.url,
                      filename: part.filename!,
                    }
                  : {
                      type: "file",
                      filename: part.filename!,
                      data: part.url,
                      mimeType: part.mediaType,
                    },
              ],
              contentType: part.mediaType ?? "unknown/unknown",
              status: { type: "complete" as const },
            })),
          metadata: message.metadata as MessageMetadata,
        };

      case "system":
      case "assistant": {
        const timing = metadata.messageTiming?.[message.id];
        return {
          role: message.role,
          id: message.id,
          createdAt,
          content,
          metadata: {
            ...(message.metadata as MessageMetadata),
            ...(timing && { timing }),
          },
        };
      }

      default:
        console.warn(`Unsupported message role: ${message.role}`);
        return [];
    }
  },
);
