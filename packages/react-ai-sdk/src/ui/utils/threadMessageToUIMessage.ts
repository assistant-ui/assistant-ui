import type { ThreadMessage } from "@assistant-ui/react";
import type { UIMessage } from "@ai-sdk/react";

export function threadMessageToUIMessage(message: ThreadMessage): UIMessage {
  const parts: NonNullable<UIMessage["parts"]> = [];

  for (const content of message.content) {
    if (content.type === "text") {
      parts.push({ type: "text", text: content.text });
    }
  }

  if (message.attachments) {
    for (const attachment of message.attachments) {
      const content = attachment.content[0];
      if (attachment.type === "image" && content?.type === "image") {
        parts.push({
          type: "file",
          filename: attachment.name,
          mediaType: attachment.contentType,
          url: content.image,
        });
      } else if (attachment.type === "file" && content?.type === "file") {
        parts.push({
          type: "file",
          filename: attachment.name,
          mediaType: attachment.contentType,
          url: content.data,
        });
      }
    }
  }

  return {
    id: message.id,
    role: message.role,
    parts: parts,
  } as UIMessage;
}
