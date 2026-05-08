import type { AgentSession } from "../../../augment/types";
import type {
  AssistantThreadListItem,
  AssistantThreadMessageLike,
  PendingFollowUp,
  PendingApproval,
  PendingQuestion,
  PendingWorkspaceEnvRequest,
} from "../../assistantTypes";

export type AugmentAssistantStore = {
  session: AgentSession | null;
  threadId: string | null;
  threads: AssistantThreadListItem[];
  messages: AssistantThreadMessageLike[];
  isRunning: boolean;
  pendingFollowUps: PendingFollowUp[];
  pendingApprovals: PendingApproval[];
  pendingQuestions: PendingQuestion[];
  pendingWorkspaceEnvRequests: PendingWorkspaceEnvRequest[];
  lastError: string | null;
};

export const initialAugmentAssistantStore: AugmentAssistantStore = {
  session: null,
  threadId: null,
  threads: [],
  messages: [],
  isRunning: false,
  pendingFollowUps: [],
  pendingApprovals: [],
  pendingQuestions: [],
  pendingWorkspaceEnvRequests: [],
  lastError: null,
};

export function createUserMessage(
  content: string,
  attachments: unknown[] = [],
): AssistantThreadMessageLike {
  return {
    id: crypto.randomUUID(),
    role: "user",
    createdAt: new Date(),
    content: content ? [{ type: "text", text: content }] : [],
    attachments,
  };
}

export function safeConvertMessage(
  message: AssistantThreadMessageLike,
): AssistantThreadMessageLike {
  if (message.role === "user" && message.status !== undefined) {
    const { status: _status, ...rest } = message;
    return rest;
  }
  return message;
}
