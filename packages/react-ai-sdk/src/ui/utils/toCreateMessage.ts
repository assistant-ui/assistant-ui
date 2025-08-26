import { AppendMessage } from "@assistant-ui/react";
import {
  CreateUIMessage,
  generateId,
  UIDataTypes,
  UIMessage,
  UIMessagePart,
  UITools,
} from "ai";

export const toCreateMessage = <UI_MESSAGE extends UIMessage = UIMessage>(
  message: AppendMessage,
): CreateUIMessage<UI_MESSAGE> => {
  const inputParts = [
    ...message.content.filter((c) => c.type !== "file"),
    ...(message.attachments?.flatMap((a) =>
      a.content.map((c) => ({
        ...c,
        filename: a.name,
      })),
    ) ?? []),
  ];

  const parts = inputParts.map((part): UIMessagePart<UIDataTypes, UITools> => {
    switch (part.type) {
      case "text":
        return {
          type: "text",
          text: part.text,
        };
      case "image":
        return {
          type: "file",
          url: part.image,
          ...(part.filename && { filename: part.filename }),
          mediaType: "image/png",
        };
      case "file":
        return {
          type: "file",
          url: part.data,
          mediaType: part.mimeType,
          ...(part.filename && { filename: part.filename }),
        };
      default:
        throw new Error(`Unsupported part type: ${part.type}`);
    }
  });

  return {
    id: generateId(),
    role: message.role,
    parts,
  } satisfies CreateUIMessage<UIMessage> as CreateUIMessage<UI_MESSAGE>;
};
