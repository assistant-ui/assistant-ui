import type {
  ThreadSystemMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  ThreadUserMessagePart,
} from "../types/message";

export type SerializedAttachment = {
  id: string;
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  content: ThreadUserMessagePart[];
};

export type SerializedSystemMessage = Omit<ThreadSystemMessage, "createdAt"> & {
  createdAt: string;
};

export type SerializedUserMessage = Omit<
  ThreadUserMessage,
  "createdAt" | "attachments"
> & {
  createdAt: string;
  attachments?: SerializedAttachment[];
};

export type SerializedAssistantMessage = Omit<
  ThreadAssistantMessage,
  "createdAt" | "attachments"
> & {
  createdAt: string;
  attachments?: SerializedAttachment[];
};

export type SerializedThreadMessage =
  | SerializedSystemMessage
  | SerializedUserMessage
  | SerializedAssistantMessage;
