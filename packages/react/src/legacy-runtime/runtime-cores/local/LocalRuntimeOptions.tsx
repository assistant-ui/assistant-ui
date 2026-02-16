import type {
  ThreadHistoryAdapter,
  AttachmentAdapter,
  ThreadMessageLike,
  FeedbackAdapter,
  SpeechSynthesisAdapter,
  DictationAdapter,
  SuggestionAdapter,
  ChatModelAdapter,
} from "@assistant-ui/core";
import type { AssistantCloud } from "assistant-cloud";

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

// TODO align LocalRuntimeOptions with LocalRuntimeOptionsBase
export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const {
    cloud,
    initialMessages,
    maxSteps,
    adapters,
    unstable_humanToolNames,
    ...rest
  } = options;

  return {
    localRuntimeOptions: {
      cloud,
      initialMessages,
      maxSteps,
      adapters,
      unstable_humanToolNames,
    },
    otherOptions: rest,
  };
};
