import type { CoreMessage } from "../../types";
import { AttachmentAdapter } from "../attachment/AttachmentAdapter";
import { FeedbackAdapter } from "../feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";

export type LocalRuntimeOptions = {
  initialMessages?: readonly CoreMessage[] | undefined;
  maxToolRoundtrips?: number | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
        feedback?: FeedbackAdapter | undefined;
      }
    | undefined;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const { initialMessages, maxToolRoundtrips, adapters, ...rest } = options;
  return {
    localRuntimeOptions: { initialMessages, maxToolRoundtrips, adapters },
    otherOptions: rest,
  };
};
