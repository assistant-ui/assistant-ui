/**
 * Core types for the Agent UI runtime.
 */

/**
 * Task/Session statuses:
 * - draft: Session in configuration state (before launch)
 * - starting: Session is starting up
 * - running: Session is actively running
 * - waiting_input: Session is waiting for tool approval or user input
 * - completed: Session has completed successfully
 * - failed: Session encountered an error and failed
 * - interrupting: Session received interrupt signal and is shutting down
 * - interrupted: Session was interrupted but can be resumed
 * - discarded: Draft session was discarded by the user
 */
export type TaskStatus =
  | "draft"
  | "starting"
  | "running"
  | "waiting_input"
  | "completed"
  | "failed"
  | "interrupting"
  | "interrupted"
  | "discarded";

export type AgentStatus = "running" | "paused" | "completed" | "failed";
export type ApprovalStatus = "pending" | "processing" | "approved" | "denied";

export interface TaskState {
  id: string;
  title: string;
  status: TaskStatus;
  cost: number;
  agents: AgentState[];
  pendingApprovals: ApprovalState[];
  pendingUserInputs: UserInputState[];
  proposedPlan: PlanState | undefined;
  createdAt: Date;
  completedAt: Date | undefined;
}

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  cost: number;
  events: AgentEvent[];
  activeItems: ActiveItem[];
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

// User Input types

export type UserInputQuestion = {
  id: string;
  prompt: string;
  type: "text" | "select" | "confirm";
  options?: string[];
};

export type UserInputStatus = "pending" | "processing" | "resolved";

export interface UserInputState {
  id: string;
  questions: UserInputQuestion[];
  status: UserInputStatus;
  agentId: string;
  taskId: string;
  createdAt: Date;
}

// Plan types

export type PlanStatus = "streaming" | "proposed" | "approved" | "rejected";

export interface PlanState {
  id: string;
  text: string;
  status: PlanStatus;
  agentId: string;
  taskId: string;
}

// Activity/Item types

export interface ActiveItem {
  id: string;
  itemType: string;
  title?: string;
  detail?: string;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  agentId: string;
}

export type AgentEventType =
  | "tool_call"
  | "tool_result"
  | "reasoning"
  | "message"
  | "error"
  | "task_started"
  | "task_completed"
  | "agent_spawned"
  | "agent_completed"
  | "tool_approved"
  | "tool_denied"
  | "tool_progress"
  | "cost_update"
  | "system_init"
  | "user_input_requested"
  | "user_input_resolved"
  | "plan_proposed"
  | "item_started"
  | "item_updated"
  | "item_completed";

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

export interface UserInputRequestedEvent extends AgentEvent {
  type: "user_input_requested";
  content: {
    requestId: string;
    questions: UserInputQuestion[];
  };
}

export interface UserInputResolvedEvent extends AgentEvent {
  type: "user_input_resolved";
  content: {
    requestId: string;
    answers: Record<string, string>;
  };
}

export interface PlanProposedEvent extends AgentEvent {
  type: "plan_proposed";
  content: {
    planId: string;
    text: string;
  };
}

export interface ItemStartedEvent extends AgentEvent {
  type: "item_started";
  content: {
    itemId: string;
    itemType: string;
    title?: string;
  };
}

export interface ItemUpdatedEvent extends AgentEvent {
  type: "item_updated";
  content: {
    itemId: string;
    detail?: string;
    title?: string;
  };
}

export interface ItemCompletedEvent extends AgentEvent {
  type: "item_completed";
  content: {
    itemId: string;
    status: "completed" | "failed";
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
  | "tool_progress"
  | "reasoning"
  | "message"
  | "message_delta"
  | "cost_update"
  | "system_init"
  | "user_input_requested"
  | "user_input_resolved"
  | "plan_delta"
  | "plan_completed"
  | "plan_approved"
  | "plan_rejected"
  | "item_started"
  | "item_updated"
  | "item_completed";

export interface SDKEvent {
  type: SDKEventType;
  taskId: string;
  agentId?: string;
  data: unknown;
  timestamp: Date;
}

export interface AgentClientConfig {
  /**
   * Client-auth token used by your app backend.
   *
   * Do NOT pass a raw Anthropic API key from the browser.
   * This value is sent to your app's `/api/agent` endpoint.
   */
  apiKey: string;
  baseUrl?: string | undefined;
  model?: string;
}

export interface CodexClientConfig {
  /** Working directory for the Codex session */
  cwd: string;
  /** Path to the codex binary (default: "codex") */
  codexPath?: string;
  /** AI model to use */
  model?: string;
  /** OpenAI API key — passed to subprocess via OPENAI_API_KEY env var */
  apiKey?: string;
}

export interface CreateTaskOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
  maxTurns?: number;
  allowedTools?: string[];
  /**
   * Custom function to determine if a tool requires approval.
   *
   * This callback is local-only and never sent over the network.
   * - With HttpAgentClient, the function is dropped by JSON serialization and the
   *   server never receives it.
   * - With AnthropicAgentClient, server-side approval logic is defined by the
   *   server runtime/hook configuration, not this field.
   *
   * In this package, the callback is used by TaskRuntime to locally auto-approve
   * or surface approval events that arrive from the server stream.
   * For client-server architectures, enforce approval policy on the server.
   */
  requiresApproval?: (toolName: string, input: unknown) => boolean;
}
