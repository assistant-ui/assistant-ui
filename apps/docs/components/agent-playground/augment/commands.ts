import type { SessionCommand, SubmitWorkspaceEnvInput } from './types';

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high' | 'xhigh';

export function sendMessageCommand(content: string): SessionCommand {
  return { type: 'sendMessage', payload: { content } };
}

export function abortCommand(): SessionCommand {
  return { type: 'abort', payload: {} };
}

export function switchModeCommand(modeId: string): SessionCommand {
  return { type: 'switchMode', payload: { modeId } };
}

export function setThinkingLevelCommand(level: ThinkingLevel): SessionCommand {
  return { type: 'setThinkingLevel', payload: { level } };
}

export function approveToolCallCommand(
  decision: 'approve' | 'decline' | 'always_allow_category',
): SessionCommand {
  return { type: 'approveToolCall', payload: { decision } };
}

export function respondToToolSuspensionCommand(resumeData: unknown): SessionCommand {
  return { type: 'respondToToolSuspension', payload: { resumeData } };
}

export function submitWorkspaceEnvCommand(input: SubmitWorkspaceEnvInput): SessionCommand {
  return { type: 'submitWorkspaceEnv', payload: input };
}

export function skipWorkspaceEnvCommand(requestId: string): SessionCommand {
  return { type: 'skipWorkspaceEnv', payload: { requestId } };
}

export function respondToQuestionCommand(questionId: string, answer: string): SessionCommand {
  return { type: 'respondToQuestion', payload: { questionId, answer } };
}
