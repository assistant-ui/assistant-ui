import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { CreateAppendMessage } from "../api/thread-runtime";

export const toAppendMessage = (
  messages: readonly ThreadMessage[],
  message: CreateAppendMessage,
): AppendMessage => {
  if (typeof message === "string") {
    return {
      createdAt: new Date(),
      parentId: messages.at(-1)?.id ?? null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: message }],
      attachments: [],
      metadata: { custom: {} },
    };
  }

  return {
    createdAt: message.createdAt ?? new Date(),
    parentId:
      message.parentId === undefined
        ? (messages.at(-1)?.id ?? null)
        : message.parentId,
    sourceId: message.sourceId ?? null,
    role: message.role ?? "user",
    content: message.content,
    attachments: message.attachments ?? [],
    metadata: message.metadata ?? { custom: {} },
    runConfig: message.runConfig ?? {},
    startRun: message.startRun,
  } as AppendMessage;
};
