import type {
  AppendMessage,
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  ExternalStoreThreadListAdapter,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  SpeechSynthesisAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type { AbstractAgent } from "@ag-ui/client";
import type { Logger } from "./logger";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

/**
 * @experimental This API is still under active development and might change without notice.
 *
 * Same as ExternalStoreThreadListAdapter, except `onSwitchToThread` returns
 * the messages (and optional state) to hydrate the thread with.
 */
type SwitchToThreadResult = {
  messages: readonly ThreadMessage[];
  state?: ReadonlyJSONValue;
  /**
   * Set when the thread has a run in flight. The runtime resumes the run
   * after hydrating, the same way `ThreadHistoryAdapter.load()` does when it
   * returns `unstable_resume: true`.
   */
  unstable_resume?: boolean;
};

export type UseAgUiThreadListAdapter = Omit<
  ExternalStoreThreadListAdapter,
  "onSwitchToThread"
> & {
  onSwitchToThread?:
    | ((
        threadId: string,
      ) => Promise<SwitchToThreadResult> | SwitchToThreadResult)
    | undefined;
};

export type UseAgUiRuntimeAdapters = {
  attachments?: AttachmentAdapter;
  speech?: SpeechSynthesisAdapter;
  dictation?: DictationAdapter;
  voice?: RealtimeVoiceAdapter;
  feedback?: FeedbackAdapter;
  history?: ThreadHistoryAdapter;
  /**
   * @experimental This API is still under active development and might change without notice.
   */
  threadList?: UseAgUiThreadListAdapter;
};

export type UseAgUiRuntimeOptions = ExternalStoreSharedOptions & {
  agent: AbstractAgent;
  logger?: Partial<Logger>;
  showThinking?: boolean;
  onError?: (e: Error) => void;
  onCancel?: () => void;
  adapters?: UseAgUiRuntimeAdapters;
};

export type AgUiInterruptReason =
  | "tool_call"
  | "input_required"
  | "confirmation"
  | (string & {});

export type AgUiInterrupt = {
  id: string;
  reason: AgUiInterruptReason;
  message?: string;
  toolCallId?: string;
  responseSchema?: Record<string, unknown>;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

export type AgUiResumeEntry = {
  interruptId: string;
  status: "resolved" | "cancelled";
  payload?: unknown;
};

export type AgUiRuntimeExtras = {
  interrupts: readonly AgUiInterrupt[];
  submitInterruptResponses: (
    responses: readonly AgUiResumeEntry[],
  ) => Promise<void>;
  steerAway: (message: AppendMessage) => Promise<void>;
};

export type AgUiRunFinishedOutcome =
  | { type: "success" }
  | { type: "interrupt"; interrupts: AgUiInterrupt[] };

export type AgUiEvent =
  | { type: "RUN_STARTED"; runId: string }
  | {
      type: "RUN_FINISHED";
      runId: string;
      outcome?: AgUiRunFinishedOutcome;
    }
  | { type: "RUN_CANCELLED"; runId?: string }
  | { type: "RUN_ERROR"; message?: string; code?: string }
  | { type: "TEXT_MESSAGE_START"; messageId?: string }
  | { type: "TEXT_MESSAGE_CONTENT"; messageId?: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; messageId?: string }
  | { type: "TEXT_MESSAGE_CHUNK"; delta: string }
  | { type: "THINKING_START"; title?: string }
  | { type: "THINKING_TEXT_MESSAGE_START" }
  | { type: "THINKING_TEXT_MESSAGE_CONTENT"; delta: string }
  | { type: "THINKING_TEXT_MESSAGE_END" }
  | { type: "THINKING_END" }
  | { type: "REASONING_START"; messageId?: string }
  | { type: "REASONING_MESSAGE_START"; messageId?: string }
  | { type: "REASONING_MESSAGE_CONTENT"; messageId?: string; delta: string }
  | { type: "REASONING_MESSAGE_END"; messageId?: string }
  | { type: "REASONING_END"; messageId?: string }
  | {
      type: "TOOL_CALL_START";
      toolCallId: string;
      toolCallName?: string;
      parentMessageId?: string;
    }
  | { type: "TOOL_CALL_ARGS"; toolCallId: string; delta: string }
  | { type: "TOOL_CALL_END"; toolCallId: string }
  | {
      type: "TOOL_CALL_CHUNK";
      toolCallId?: string;
      toolCallName?: string;
      parentMessageId?: string;
      delta?: string;
    }
  | {
      type: "TOOL_CALL_RESULT";
      messageId?: string;
      toolCallId: string;
      content: string;
      role?: "tool";
    }
  | {
      type: "ACTIVITY_SNAPSHOT";
      activityType: string;
      content: Record<string, unknown>;
    }
  | { type: "RAW"; event: any; source?: string }
  | { type: "CUSTOM"; name: string; value: any }
  | { type: "STATE_SNAPSHOT"; snapshot: any }
  | { type: "STATE_DELTA"; delta: any[] }
  | { type: "MESSAGES_SNAPSHOT"; messages: any[] };
