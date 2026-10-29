import type { ThreadMessage } from "@assistant-ui/core";
import type { ToolCallApproval } from "assistant-stream";
import { toLanguageModelMessages } from "./toLanguageModelMessages";

type LanguageModelMessage = ReturnType<typeof toLanguageModelMessages>[number];
type AssistantMessage = Extract<LanguageModelMessage, { role: "assistant" }>;
type ToolMessage = Extract<LanguageModelMessage, { role: "tool" }>;
type ToolResultPart = ToolMessage["content"][number];
type AssistantPart = AssistantMessage["content"][number];

type ToolApprovalRequestPart = {
  type: "tool-approval-request";
  approvalId: string;
  toolCallId: string;
  reason?: string;
  isAutomatic?: boolean;
  signature?: string;
  inputSchemaInput?: unknown;
};

type ToolApprovalResponsePart = {
  type: "tool-approval-response";
  approvalId: string;
  approved: boolean;
  reason?: string;
};

type DecidedApproval = ToolCallApproval & { readonly approved: boolean };

type ExecutionDeniedResultPart = Omit<ToolResultPart, "output"> & {
  output: { type: "execution-denied"; reason?: string };
};

/** The subset of the AI SDK's `ModelMessage` these requests carry. */
type ModelMessage =
  | Exclude<LanguageModelMessage, AssistantMessage | ToolMessage>
  | {
      role: "assistant";
      content: (AssistantPart | ToolApprovalRequestPart)[];
    }
  | {
      role: "tool";
      content: (
        | ToolResultPart
        | ExecutionDeniedResultPart
        | ToolApprovalResponsePart
      )[];
    };

/**
 * `toLanguageModelMessages` plus the approval parts an AI SDK server reads a
 * decision from, in the layout of the AI SDK's `convertToModelMessages`.
 */
export function toModelMessages(
  messages: readonly ThreadMessage[],
  options: Parameters<typeof toLanguageModelMessages>[1],
): ModelMessage[] {
  const approvals = new Map<string, DecidedApproval>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.content) {
      // The data stream decoder keeps the server's approval fields verbatim.
      if (part.type === "tool-call" && part.approval?.approved !== undefined)
        approvals.set(part.toolCallId, part.approval as DecidedApproval);
    }
  }

  const converted = toLanguageModelMessages(messages, options);
  if (approvals.size === 0) return converted;

  const result: ModelMessage[] = [];
  let responses: ToolApprovalResponsePart[] = [];
  // An approved call the server has yet to run has no tool message to join.
  const flushResponses = () => {
    if (responses.length > 0) result.push({ role: "tool", content: responses });
    responses = [];
  };

  for (const message of converted) {
    if (message.role === "tool") {
      result.push({
        ...message,
        content: [
          ...responses,
          ...message.content.map((part) => {
            const approval = approvals.get(part.toolCallId);
            if (approval?.approved !== false) return part;
            return {
              ...part,
              output: {
                type: "execution-denied" as const,
                ...(approval.reason !== undefined && {
                  reason: approval.reason,
                }),
              },
            };
          }),
        ],
      });
      responses = [];
      continue;
    }

    flushResponses();
    if (message.role !== "assistant") {
      result.push(message);
      continue;
    }
    result.push({
      ...message,
      content: message.content.flatMap<AssistantPart | ToolApprovalRequestPart>(
        (part) => {
          if (part.type !== "tool-call") return [part];
          const approval = approvals.get(part.toolCallId);
          if (!approval) return [part];
          responses.push({
            type: "tool-approval-response",
            approvalId: approval.id,
            approved: approval.approved,
            ...(approval.reason !== undefined && { reason: approval.reason }),
          });
          return [
            part,
            {
              type: "tool-approval-request",
              approvalId: approval.id,
              toolCallId: part.toolCallId,
              ...(approval.requestReason !== undefined && {
                reason: approval.requestReason,
              }),
              ...(approval.isAutomatic !== undefined && {
                isAutomatic: approval.isAutomatic,
              }),
              ...(approval.signature !== undefined && {
                signature: approval.signature,
              }),
              ...(Object.hasOwn(approval, "inputSchemaInput") && {
                inputSchemaInput: approval.inputSchemaInput,
              }),
            },
          ];
        },
      ),
    });
  }
  flushResponses();

  return result;
}
