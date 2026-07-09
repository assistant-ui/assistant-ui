import type { AppendMessage } from "@assistant-ui/core";
import type {
  CreateUIMessage,
  UIDataTypes,
  UIMessage,
  UIMessagePart,
  UITools,
} from "ai";

type InputPart = AppendMessage["content"][number] & {
  readonly contentType?: string | undefined;
  readonly filename?: string | undefined;
};

const getDataUrlMediaType = (url: string) => {
  const match = /^data:([^;,]+)(?:[;,])/.exec(url);
  return match?.[1];
};

const getImageMediaType = (part: {
  readonly contentType?: string | undefined;
  readonly image: string;
}) => {
  if (part.contentType?.startsWith("image/")) return part.contentType;

  const dataUrlMediaType = getDataUrlMediaType(part.image);
  if (dataUrlMediaType?.startsWith("image/")) return dataUrlMediaType;

  return "image/png";
};

export const toCreateMessage = <UI_MESSAGE extends UIMessage = UIMessage>(
  message: AppendMessage,
): CreateUIMessage<UI_MESSAGE> => {
  const inputParts: InputPart[] = [
    ...message.content,
    ...(message.attachments?.flatMap((a) =>
      a.content.map((c) => ({
        ...c,
        filename: a.name,
        contentType: a.contentType,
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
          mediaType: getImageMediaType(part),
        };
      case "file":
        return {
          type: "file",
          url: part.data,
          mediaType: part.mimeType,
          ...(part.filename && { filename: part.filename }),
        };
      case "data":
        return {
          type: `data-${part.name}`,
          data: part.data,
        };
      default:
        throw new Error(`Unsupported part type: ${part.type}`);
    }
  });

  return {
    role: message.role,
    parts,
    metadata: message.metadata,
  } satisfies CreateUIMessage<UIMessage> as CreateUIMessage<UI_MESSAGE>;
};
