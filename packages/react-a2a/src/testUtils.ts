import { A2AMessage } from "./types";
import { A2AMessagesEvent } from "./useA2AMessages";

export const mockStreamCallbackFactory = (
  events: Array<A2AMessagesEvent<A2AMessage>>,
) =>
  async function* () {
    for (const event of events) {
      yield event;
    }
  };
