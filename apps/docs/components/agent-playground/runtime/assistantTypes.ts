export type AssistantMessageStatus =
  | { type: 'running' }
  | { type: 'complete'; reason: 'stop' }
  | { type: 'incomplete'; reason: 'cancelled' | 'error' | 'other' };

export type AssistantTextPart = { type: 'text'; text: string };
export type AssistantReasoningPart = { type: 'reasoning'; text: string };
export type AssistantToolPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  argsText?: string | undefined;
  result?: unknown | undefined;
  isError?: boolean | undefined;
  artifact?: unknown | undefined;
  status?: { type: 'running' | 'complete' | 'incomplete' | 'requires-action'; reason?: string | undefined } | undefined;
};

export type AssistantMessagePart = AssistantTextPart | AssistantReasoningPart | AssistantToolPart;

export type AssistantThreadMessageLike = {
  id: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  content: AssistantMessagePart[];
  status?: AssistantMessageStatus | undefined;
  attachments?: unknown[] | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type PendingApproval = {
  id: string;
  toolCallId?: string | undefined;
  toolName: string;
  args: unknown;
};

export type PendingQuestion = {
  id: string;
  toolCallId?: string | undefined;
  question: string;
  options?: Array<{ label?: string | undefined; description?: string | undefined; value?: string | undefined } | string> | undefined;
};

export type PendingWorkspaceEnvRequest = {
  id: string;
  appPath: string;
  reason: string;
  requested: WorkspaceEnvRequestItem[];
};

export type PendingFollowUp = {
  id: string;
  title: string;
  content: string;
  source?: string | undefined;
};

export type ApprovalDecision = 'approve' | 'decline' | 'always_allow_category';

export type AssistantThreadListItem = {
  id: string;
  title: string;
  status: 'regular';
};
import type { WorkspaceEnvRequestItem } from '@/components/agent-playground/augment/types';
