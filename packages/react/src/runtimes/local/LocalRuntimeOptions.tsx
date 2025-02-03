import { ThreadHistoryAdapter } from "../adapters/thread-history/ThreadHistoryAdapter";
import { AttachmentAdapter } from "../adapters/attachment/AttachmentAdapter";
import { ThreadMessageLike } from "../external-store";
import { FeedbackAdapter } from "../adapters/feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../adapters/speech/SpeechAdapterTypes";
import { ChatModelAdapter } from "./ChatModelAdapter";
import { AssistantCloud } from "../../cloud";

export type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
  };

  /**
   * @deprecated This is a temporary workaround for subgraph frontend function calls.
   * This feature will be removed in a future version without notice. DO NOT USE.
   */
  unstable_shouldContinueIgnoreToolNames?: string[] | undefined;
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
    unstable_shouldContinueIgnoreToolNames,
    ...rest
  } = options;

  return {
    localRuntimeOptions: {
      cloud,
      initialMessages,
      maxSteps,
      adapters,
      unstable_shouldContinueIgnoreToolNames,
    },
    otherOptions: rest,
  };
};
