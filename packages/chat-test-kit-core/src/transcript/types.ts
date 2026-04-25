import type { TranscriptVersion } from "./version";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type TextPart = {
  type: "text";
  text: string;
};

export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: JsonObject;
  argsText: string;
};

export type ContentPart = TextPart | ToolCallPart;

export type UserTurn = {
  kind: "user";
  content: ContentPart[];
};

export type AssistantStreamTurn = {
  kind: "assistantStream";
  text: string;
  chunks: string[];
  interChunkDelayMs?: number;
  finish?: { reason: "stop" | "abort" | "error" };
};

export type AssistantToolCallTurn = {
  kind: "assistantToolCall";
  toolCallId: string;
  name: string;
  args: JsonObject;
  argsText: string;
};

export type ToolResultTurn = {
  kind: "toolResult";
  toolCallId: string;
  value: JsonValue;
};

export type DelayTurn = {
  kind: "delay";
  ms: number;
};

export type MetadataTurn = {
  kind: "metadata";
  data: JsonObject;
};

export type Turn =
  | UserTurn
  | AssistantStreamTurn
  | AssistantToolCallTurn
  | ToolResultTurn
  | DelayTurn
  | MetadataTurn;

export type InjectionPosition = {
  turnIndex: number;
  afterChunk?: number;
};

export type CancelInjection = {
  kind: "cancel";
  at: InjectionPosition;
};

export type InterruptInjection = {
  kind: "interrupt";
  at: InjectionPosition;
  reason?: string;
};

export type TransportErrorInjection = {
  kind: "transportError";
  at: InjectionPosition;
  code?: number;
  message: string;
};

export type DisconnectInjection = {
  kind: "disconnect";
  at: InjectionPosition;
};

export type AbortAndRestartInjection = {
  kind: "abortAndRestart";
  at: InjectionPosition;
};

export type Injection =
  | CancelInjection
  | InterruptInjection
  | TransportErrorInjection
  | DisconnectInjection
  | AbortAndRestartInjection;

export type Transcript = {
  version: TranscriptVersion;
  turns: Turn[];
  injections: Injection[];
};
