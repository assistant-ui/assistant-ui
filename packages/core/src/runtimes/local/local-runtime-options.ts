import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type {
  SpeechSynthesisAdapter,
  DictationAdapter,
} from "../../adapters/speech";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { SuggestionAdapter } from "../../adapters/suggestion";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";

export type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    voice?: RealtimeVoiceAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    suggestion?: SuggestionAdapter | undefined;
  };

  /**
   * Names of tools that pause the run until a result is supplied via `addToolResult`.
   */
  unstable_humanToolNames?: string[] | undefined;

  /**
   * Opt in to message queuing: a message sent during a run is held in
   * `composer.queue` and sent once the run settles. Steering runs it next.
   */
  unstable_enableMessageQueue?: boolean | undefined;

  /**
   * Auto-clear the message queue when the thread rewinds (message edit).
   * Defaults to `true`.
   * @deprecated Removal after 2026-11-05 — the queue will always survive rewinds.
   */
  unstable_queueClearOnRewind?: boolean | undefined;

  /**
   * Auto-clear the message queue when the user cancels the run. Defaults to
   * `true`. When `false`, cancel pauses the queue and keeps the pending
   * items; the next send drains them.
   * @deprecated Removal after 2026-11-05 — cancel will always pause the queue and keep the items.
   */
  unstable_queueClearOnCancel?: boolean | undefined;
};
