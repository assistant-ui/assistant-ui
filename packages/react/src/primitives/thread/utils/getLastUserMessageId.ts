"use client";

import { ThreadMessage } from "../../../types";

export const getLastUserMessageId = (
  messages: ThreadMessage[] | readonly ThreadMessage[],
): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (candidate?.role === "user") {
      return candidate.id;
    }
  }
  return undefined;
};
