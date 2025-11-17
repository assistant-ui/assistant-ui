import { MessageStatus } from "@assistant-ui/react";
import { ReadonlyJSONObject } from "assistant-stream/utils";

// A2A Message Types
export type A2AMessage = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | A2AMessageContent[];
  tool_calls?: A2AToolCall[];
  tool_call_id?: string;
  artifacts?: A2AArtifact[];
  status?: MessageStatus;
};

export type A2AMessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string | { url: string } }
  | { type: "data"; data: any };

export type A2AToolCall = {
  id: string;
  name: string;
  args: ReadonlyJSONObject;
  argsText?: string;
};

export type A2AArtifact = {
  name: string;
  parts: A2AArtifactPart[];
};

export type A2AArtifactPart = {
  kind: "text" | "data" | "file";
  data?: any;
  text?: string;
  metadata?: Record<string, any>;
};

// A2A Events (similar to LangGraph events)
export type A2AEvent = {
  event: A2AKnownEventTypes | string;
  data: any;
};

export enum A2AKnownEventTypes {
  TaskUpdate = "task-update",
  TaskComplete = "task-complete",
  TaskFailed = "task-failed",
  Artifacts = "artifacts",
  StateUpdate = "state-update",
  Error = "error",
}

// A2A Task State
export type A2ATaskState = {
  id: string;
  state: "pending" | "working" | "completed" | "failed";
  progress?: number;
  message?: string;
};

// A2A Task Result
export type A2ATaskResult = {
  id: string;
  status: {
    state: "pending" | "working" | "completed" | "failed";
    message?: string;
  };
  artifacts?: A2AArtifact[];
  history?: Array<{
    messageId: string;
    role: string;
    parts?: Array<{ kind: string; text?: string; data?: any }>;
  }>;
};

// A2A Configuration
export type A2AConfig = {
  contextId?: string;
  runConfig?: Record<string, any>;
};

// A2A Send Message Configuration
export type A2ASendMessageConfig = A2AConfig & {
  command?: A2ACommand;
};

// A2A Commands (for interrupts/resume)
export type A2ACommand = {
  resume?: string;
  interrupt?: string;
};

// A2A Stream Callback
export type A2AStreamCallback<TMessage> = (
  messages: TMessage[],
  config: A2ASendMessageConfig & { abortSignal: AbortSignal },
) => Promise<AsyncGenerator<A2AEvent>> | AsyncGenerator<A2AEvent>;

// Event handler callback types
export type OnTaskUpdateEventCallback = (
  data: A2ATaskState,
) => void | Promise<void>;
export type OnArtifactsEventCallback = (
  artifacts: A2AArtifact[],
) => void | Promise<void>;
export type OnErrorEventCallback = (error: unknown) => void | Promise<void>;
export type OnStateUpdateEventCallback = (
  state: unknown,
) => void | Promise<void>;
export type OnCustomEventCallback = (
  type: string,
  data: unknown,
) => void | Promise<void>;
