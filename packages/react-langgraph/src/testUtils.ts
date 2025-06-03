import { LangChainMessage } from "./types";
import { LangGraphMessagesEvent } from "./useLangGraphMessages";

export const mockStreamCallbackFactory = (
  events: Array<LangGraphMessagesEvent<LangChainMessage>>,
) =>
  async function* () {
    for (const event of events) {
      yield event;
    }
  };
