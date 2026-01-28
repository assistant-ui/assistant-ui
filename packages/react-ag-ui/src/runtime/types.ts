import type {
  AttachmentAdapter,
  DictationAdapter,
  FeedbackAdapter,
  SpeechSynthesisAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import type { HttpAgent } from "@ag-ui/client";
import type { Logger } from "./logger";
import type { ReadonlyJSONValue } from "assistant-stream/utils";

export type UseAgUiThreadListAdapter = {
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  threadId?: string | undefined;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
  onSwitchToThread?:
    | ((
        threadId: string,
      ) =>
        | Promise<{ messages: ThreadMessage[]; state?: ReadonlyJSONValue }>
        | { messages: ThreadMessage[]; state?: ReadonlyJSONValue })
    | undefined;
};

export type UseAgUiRuntimeAdapters = {
  attachments?: AttachmentAdapter;
  speech?: SpeechSynthesisAdapter;
  dictation?: DictationAdapter;
  feedback?: FeedbackAdapter;
  history?: ThreadHistoryAdapter;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  threadList?: UseAgUiThreadListAdapter;
};

export type UseAgUiRuntimeOptions = {
  agent: HttpAgent;
  logger?: Partial<Logger>;
  showThinking?: boolean;
  onError?: (e: Error) => void;
  onCancel?: () => void;
  adapters?: UseAgUiRuntimeAdapters;
};

export type AgUiEvent =
  | { type: "RUN_STARTED"; runId: string }
  | { type: "RUN_FINISHED"; runId: string }
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
  | { type: "RAW"; event: any; source?: string }
  | { type: "CUSTOM"; name: string; value: any }
  | { type: "STATE_SNAPSHOT"; snapshot: any }
  | { type: "STATE_DELTA"; delta: any[] }
  | { type: "MESSAGES_SNAPSHOT"; messages: any[] };
