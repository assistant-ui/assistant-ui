import type { LangChainMessage } from "./types";
import type { LangGraphMessagesEvent } from "./useLangGraphMessages";

export const mockStreamCallbackFactory = (
  events: Array<LangGraphMessagesEvent<LangChainMessage>>,
) =>
  async function* () {
    for (const event of events) {
      yield event;
    }
  };
