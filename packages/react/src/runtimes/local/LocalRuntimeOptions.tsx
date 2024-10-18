import type { CoreMessage } from "../../types";
import { AttachmentAdapter } from "../attachment/AttachmentAdapter";
import { FeedbackAdapter } from "../feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";
import { ChatModelAdapter } from "./ChatModelAdapter";

export type LocalRuntimeOptionsBase = {
  maxSteps?: number | undefined;
  /**
   * @deprecated Use `maxSteps` (which is `maxToolRoundtrips` + 1; if you set `maxToolRoundtrips` to 2, set `maxSteps` to 3) instead. This field will be removed in v0.6.
   */
  maxToolRoundtrips?: number | undefined;
  adapters: {
    chatModel: ChatModelAdapter;
    attachments?: AttachmentAdapter | undefined;
    speech?: SpeechSynthesisAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
  };
};

// TODO align LocalRuntimeOptions with LocalRuntimeOptionsBase
export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  initialMessages?: readonly CoreMessage[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const { initialMessages, maxToolRoundtrips, maxSteps, adapters, ...rest } =
    options;

  return {
    localRuntimeOptions: {
      initialMessages,
      maxToolRoundtrips,
      maxSteps,
      adapters,
    },
    otherOptions: rest,
  };
};
