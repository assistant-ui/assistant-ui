import type { ThreadMessage } from "../types/message";
import type { SerializedThreadMessage } from "../share/types";
import { serializeMessages } from "../share/serialization";

export type MessageDiff =
  | {
      type: "reset";
      messages: SerializedThreadMessage[];
    }
  | {
      type: "added" | "updated";
      messageId: string;
      message: SerializedThreadMessage;
    };

export const diffMessages = (
  prev: readonly ThreadMessage[],
  next: readonly ThreadMessage[],
): MessageDiff[] => {
  if (next.length < prev.length) {
    return [{ type: "reset", messages: serializeMessages(next) }];
  }

  const diffs: MessageDiff[] = [];

  for (let i = 0; i < next.length; i++) {
    const nextMsg = next[i]!;
    const prevMsg = prev[i];

    if (prevMsg === undefined) {
      diffs.push({
        type: "added",
        messageId: nextMsg.id,
        message: serializeMessages([nextMsg])[0]!,
      });
    } else if (prevMsg.id !== nextMsg.id) {
      return [{ type: "reset", messages: serializeMessages(next) }];
    } else if (prevMsg !== nextMsg) {
      diffs.push({
        type: "updated",
        messageId: nextMsg.id,
        message: serializeMessages([nextMsg])[0]!,
      });
    }
  }

  return diffs;
};
