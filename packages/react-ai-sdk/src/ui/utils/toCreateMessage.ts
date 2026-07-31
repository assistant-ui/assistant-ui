import type { AppendMessage } from "@assistant-ui/core";
import {
  httpUrlPattern,
  isParsableUrl,
  parseDataUrl,
} from "@assistant-ui/core/internal";
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
  const match = /^data:([^;,]+)(?:[;,])/i.exec(url);
  return match?.[1]?.toLowerCase();
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
      case "image": {
        const mediaType = getImageMediaType(part);
        return {
          type: "file",
          url: isParsableUrl(part.image)
            ? part.image
            : `data:${mediaType};base64,${part.image}`,
          ...(part.filename && { filename: part.filename }),
          mediaType,
        };
      }
      case "file":
        return {
          type: "file",
          // An `id` reference is an opaque provider handle, not base64, and
          // this adapter has no way to send one. Left unwrapped so it fails
          // loudly upstream rather than shipping a corrupt payload.
          url:
            isParsableUrl(part.data) || part.sourceType === "id"
              ? part.data
              : `data:${part.mimeType};base64,${part.data}`,
          mediaType: part.mimeType,
          ...(part.filename && { filename: part.filename }),
        };
      case "audio": {
        // A data URL's own media type wins over `mediaType` downstream, so the
        // envelope is rebuilt from the typed format rather than forwarded.
        const mediaType = `audio/${part.audio.format}`;
        const data = part.audio.data;
        return {
          type: "file",
          url: httpUrlPattern.test(data)
            ? data
            : `data:${mediaType};base64,${parseDataUrl(data)?.data ?? data}`,
          mediaType,
          ...(part.filename && { filename: part.filename }),
        };
      }
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
