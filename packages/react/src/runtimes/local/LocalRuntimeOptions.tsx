import type { CoreMessage } from "../../types";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";

export type LocalRuntimeOptions = {
  initialMessages?: readonly CoreMessage[] | undefined;
  maxToolRoundtrips?: number | undefined;
  adapters?:
    | {
        speech?: SpeechSynthesisAdapter | undefined;
      }
    | undefined;
};
