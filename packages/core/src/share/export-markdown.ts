import type { ThreadMessage } from "../types/message";
import type { SerializedThreadMessage } from "./types";

const formatRole = (role: string): string => {
  const capitalized = role.charAt(0).toUpperCase() + role.slice(1);
  return `**${capitalized}:**`;
};

const formatPart = (part: { type: string; [key: string]: unknown }): string => {
  switch (part.type) {
    case "text":
      return part.text as string;
    case "reasoning":
      return `> *Reasoning:* ${part.text as string}`;
    case "tool-call":
      return `\`\`\`tool-call\nTool: ${part.toolName as string}\nArgs: ${(part.argsText as string) ?? JSON.stringify(part.args)}\n\`\`\``;
    case "source": {
      const title = (part.title as string) ?? "Source";
      const url = part.url as string | undefined;
      return url ? `[${title}](${url})` : `*${title}*`;
    }
    case "image":
      return `![image](${(part.image as string) ?? "[embedded image]"})`;
    case "file":
      return `[file: ${(part.filename as string) ?? "file"}]`;
    default:
      return "";
  }
};

const formatMessage = (
  message: ThreadMessage | SerializedThreadMessage,
): string => {
  const parts = message.content
    .map((part) => formatPart(part as { type: string; [key: string]: unknown }))
    .filter(Boolean)
    .join("\n\n");
  return `${formatRole(message.role)}\n${parts}`;
};

export const toMarkdown = (
  messages: readonly (ThreadMessage | SerializedThreadMessage)[],
): string => {
  if (messages.length === 0) return "";
  return messages.map(formatMessage).join("\n\n---\n\n");
};
