import type { ThreadHistoryAdapter } from "../adapters/thread-history";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { FeedbackAdapter } from "../adapters/feedback";
import type {
  SpeechSynthesisAdapter,
  DictationAdapter,
} from "../adapters/speech";
import type { SuggestionAdapter } from "../adapters/suggestion";
import type { ChatModelAdapter } from "../shared/chat-model-adapter";

export type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    dictation?: DictationAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
    suggestion?: SuggestionAdapter | undefined;
  };

  /**
   * Names of tools that are allowed to interrupt the run in order to wait for human/external approval.
   */
  unstable_humanToolNames?: string[] | undefined;
};
