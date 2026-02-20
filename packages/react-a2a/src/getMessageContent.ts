import type { AppendMessage } from "@assistant-ui/react";
import type { A2AMessage } from "./types";

type A2AUserMessageContent = A2AMessage["content"];

export const getMessageContent = (
  msg: AppendMessage,
): A2AUserMessageContent => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];

  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck:
          | "reasoning"
          | "source"
          | "file"
          | "audio"
          | "data"
          | "component" = type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};
