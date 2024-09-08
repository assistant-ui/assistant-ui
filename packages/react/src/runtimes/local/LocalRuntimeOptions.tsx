import type { CoreMessage } from "../../types";
import { AttachmentAdapter } from "../attachment/AttachmentAdapter";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";

export type LocalRuntimeOptions = {
  initialMessages?: readonly CoreMessage[] | undefined;
  maxToolRoundtrips?: number | undefined;
  adapters?:
    | {
        attachments?: AttachmentAdapter | undefined;
        speech?: SpeechSynthesisAdapter | undefined;
      }
    | undefined;
};
