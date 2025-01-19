import { ThreadHistoryAdapter } from "../adapters/thread-history/ThreadHistoryAdapter";
import { AttachmentAdapter } from "../adapters/attachment/AttachmentAdapter";
import { ThreadMessageLike } from "../external-store";
import { FeedbackAdapter } from "../adapters/feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../adapters/speech/SpeechAdapterTypes";
import { ChatModelAdapter } from "./ChatModelAdapter";

export type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    history?: ThreadHistoryAdapter | undefined;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
  };
};

// TODO align LocalRuntimeOptions with LocalRuntimeOptionsBase
export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const { initialMessages, maxSteps, adapters, ...rest } = options;

  return {
    localRuntimeOptions: {
      initialMessages,
      maxSteps,
      adapters,
    },
    otherOptions: rest,
  };
};
