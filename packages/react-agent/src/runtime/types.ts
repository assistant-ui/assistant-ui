/**
 * Core types for the Agent UI runtime.
 */

export type TaskStatus = "queued" | "running" | "completed" | "failed";
export type AgentStatus = "running" | "paused" | "completed" | "failed";
export type ApprovalStatus = "pending" | "approved" | "denied";

export interface TaskState {
  id: string;
  title: string;
  status: TaskStatus;
  cost: number;
  agents: AgentState[];
  pendingApprovals: ApprovalState[];
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  cost: number;
  events: AgentEvent[];
  parentAgentId: string | null;
  childAgentIds: string[];
  taskId: string;
}

export interface ApprovalState {
  id: string;
  toolName: string;
  toolInput: unknown;
  reason: string;
  status: ApprovalStatus;
  agentId: string;
  taskId: string;
  createdAt: Date;
}

export type AgentEventType =
  | "tool_call"
  | "tool_result"
  | "reasoning"
  | "message"
  | "error";

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: Date;
  content: unknown;
  agentId: string;
}

export interface ToolCallEvent extends AgentEvent {
  type: "tool_call";
  content: {
    toolName: string;
    toolInput: unknown;
    toolCallId: string;
  };
}

export interface ToolResultEvent extends AgentEvent {
  type: "tool_result";
  content: {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  };
}

export interface ReasoningEvent extends AgentEvent {
  type: "reasoning";
  content: {
    text: string;
  };
}

export interface MessageEvent extends AgentEvent {
  type: "message";
  content: {
    text: string;
  };
}

export interface ErrorEvent extends AgentEvent {
  type: "error";
  content: {
    message: string;
    code?: string;
  };
}

/**
 * SDK types - these represent the interface we expect from the Anthropic Agents SDK.
 * When the actual SDK is available, these can be replaced with imports from the SDK.
 */

export interface TaskHandle {
  id: string;
  prompt: string;
}

export type SDKEventType =
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "agent_spawned"
  | "agent_completed"
  | "agent_failed"
  | "tool_use_requested"
  | "tool_use_approved"
  | "tool_use_denied"
  | "tool_use"
  | "tool_result"
  | "reasoning"
  | "message"
  | "cost_update"
  | "system_init";

export interface SDKEvent {
  type: SDKEventType;
  taskId: string;
  agentId?: string;
  data: unknown;
  timestamp: Date;
}

export interface AgentClientConfig {
  apiKey: string;
  baseUrl?: string | undefined;
  model?: string;
}

export interface CreateTaskOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
  maxTurns?: number;
  allowedTools?: string[];
  /** Custom function to determine if a tool requires approval */
  requiresApproval?: (toolName: string, input: unknown) => boolean;
}
