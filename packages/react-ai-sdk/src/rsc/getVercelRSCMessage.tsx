import {
  getExternalStoreMessage,
  type ThreadMessage,
} from "@assistant-ui/react";

export const symbolInnerRSCMessage = Symbol("innerVercelRSCMessage");

export const getVercelRSCMessage = (message: ThreadMessage) => {
  return getExternalStoreMessage(message);
};
