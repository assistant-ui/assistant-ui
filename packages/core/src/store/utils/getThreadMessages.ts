import type { ThreadMethods } from "../scopes/thread";
import type { MessageState } from "../scopes/message";

export const getThreadMessages = (thread: ThreadMethods): MessageState[] =>
  thread.getState().messageIds.map((id) => thread.message({ id }).getState());
