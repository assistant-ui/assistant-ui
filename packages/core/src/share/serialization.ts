import type { ThreadMessage } from "../types/message";
import type { CompleteAttachment } from "../types/attachment";
import type { SerializedThreadMessage, SerializedAttachment } from "./types";

const serializeAttachment = (
  att: CompleteAttachment,
): SerializedAttachment => ({
  id: att.id,
  type: att.type,
  name: att.name,
  ...(att.contentType !== undefined && { contentType: att.contentType }),
  content: att.content,
});

const serializeMessage = (message: ThreadMessage): SerializedThreadMessage => {
  const { createdAt, ...rest } = message;

  if ("attachments" in rest && Array.isArray(rest.attachments)) {
    const { attachments, ...withoutAttachments } = rest;
    return {
      ...withoutAttachments,
      createdAt: createdAt.toISOString(),
      attachments: attachments.map(serializeAttachment),
    } as SerializedThreadMessage;
  }

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
  } as SerializedThreadMessage;
};

export const serializeMessages = (
  messages: readonly ThreadMessage[],
): SerializedThreadMessage[] => messages.map(serializeMessage);

const deserializeMessage = (
  message: SerializedThreadMessage,
): ThreadMessage => {
  if (!message.id || !message.role || typeof message.createdAt !== "string") {
    throw new Error(
      "Invalid serialized message: missing required fields (id, role, createdAt)",
    );
  }

  const createdAt = new Date(message.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error(`Invalid createdAt value: ${message.createdAt}`);
  }

  const base = {
    ...message,
    createdAt,
  };

  if ("attachments" in message && Array.isArray(message.attachments)) {
    return {
      ...base,
      attachments: message.attachments.map((att) => ({
        ...att,
        status: { type: "complete" as const },
      })),
    } as ThreadMessage;
  }

  return base as ThreadMessage;
};

export const deserializeMessages = (
  messages: readonly SerializedThreadMessage[],
): ThreadMessage[] => messages.map(deserializeMessage);

export const isSerializedMessages = (
  messages: readonly (ThreadMessage | SerializedThreadMessage)[],
): messages is readonly SerializedThreadMessage[] =>
  messages.length > 0 && typeof messages[0]!.createdAt === "string";
