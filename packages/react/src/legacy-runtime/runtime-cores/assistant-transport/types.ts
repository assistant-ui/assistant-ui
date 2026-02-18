import type { ThreadMessage } from "@assistant-ui/core";
import { ReadonlyJSONValue } from "assistant-stream/utils";
import { AttachmentAdapter, ThreadHistoryAdapter } from "..";
import { UserCommands } from "../../../augmentations";
import type { ToolExecutionStatus } from "./useToolInvocations";

// Message part types
export type TextPart = {
  readonly type: "text";
  readonly text: string;
};

export type ImagePart = {
  readonly type: "image";
  readonly image: string;
};

export type UserMessagePart = TextPart | ImagePart;

export type UserMessage = {
  readonly role: "user";
  readonly parts: readonly UserMessagePart[];
};

export type AssistantMessage = {
  readonly role: "assistant";
  readonly parts: readonly TextPart[];
};

// Command types
export type AddMessageCommand = {
  readonly type: "add-message";
  readonly message: UserMessage | AssistantMessage;
  readonly parentId: string | null;
  readonly sourceId: string | null;
};

export type AddToolResultCommand = {
  readonly type: "add-tool-result";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: ReadonlyJSONValue;
  readonly isError: boolean;
  readonly artifact?: ReadonlyJSONValue;
};

export type AssistantTransportCommand =
  | AddMessageCommand
  | AddToolResultCommand
  | UserCommands;

// State types
export type AssistantTransportState = {
  readonly messages: readonly ThreadMessage[];
  readonly state?: ReadonlyJSONValue;
  readonly isRunning: boolean;
};

export type AssistantTransportConnectionMetadata = {
  pendingCommands: AssistantTransportCommand[];
  isSending: boolean;
  toolStatuses: Record<string, ToolExecutionStatus>;
};

export type AssistantTransportStateConverter<T> = (
  state: T,
  connectionMetadata: AssistantTransportConnectionMetadata,
) => AssistantTransportState;

// Queue types
export type CommandQueueState = {
  queued: AssistantTransportCommand[];
  inTransit: AssistantTransportCommand[];
};

// For now, queued items are plain commands (runConfig not supported)
export type QueuedCommand = AssistantTransportCommand;

// Task types

// Options types
export type HeadersValue = Record<string, string> | Headers;

export type AssistantTransportProtocol = "data-stream" | "assistant-transport";

export type AssistantTransportOptions<T> = {
  initialState: T;
  api: string;
  resumeApi?: string;
  protocol?: AssistantTransportProtocol;
  converter: AssistantTransportStateConverter<T>;
  headers: HeadersValue | (() => Promise<HeadersValue>);
  body?: object | (() => Promise<object | undefined>);
  onResponse?: (response: Response) => void;
  onFinish?: () => void;
  onError?: (
    error: Error,
    params: {
      commands: AssistantTransportCommand[];
      updateState: (updater: (state: T) => T) => void;
    },
  ) => void | Promise<void>;
  /**
   * Called when commands are cancelled.
   *
   * When an error occurs, queued commands are automatically cancelled after `onError` settles.
   * In this case, the `error` parameter contains the error that caused the cancellation.
   */
  onCancel?: (params: {
    commands: AssistantTransportCommand[];
    updateState: (updater: (state: T) => T) => void;
    error?: Error;
  }) => void;
  capabilities?: {
    edit?: boolean;
  };
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
    history?: ThreadHistoryAdapter | undefined;
  };
};

// (no task or stream-specific types needed in this module)
