import type { AppendMessage } from "@assistant-ui/core";
import {
  httpUrlPattern,
  parseDataUrl,
  resolveFileMediaType,
  resolveImageMediaType,
  toMediaWireUrl,
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
        const mediaType = resolveImageMediaType(part.image, part.contentType);
        return {
          type: "file",
          url: toMediaWireUrl(part.image, mediaType),
          ...(part.filename && { filename: part.filename }),
          mediaType,
        };
      }
      case "file": {
        // `mimeType` is a plain string, and an adapter reading `file.type` on a
        // file the OS cannot type yields "". Same ladder as images: declared,
        // then the envelope, then the floor.
        const mediaType = resolveFileMediaType(part.data, part.mimeType);
        return {
          type: "file",
          // An `id` reference is an opaque provider handle, not base64, and
          // this adapter has no way to send one. Left unwrapped so it fails
          // loudly upstream rather than shipping a corrupt payload.
          url:
            part.sourceType === "id"
              ? part.data
              : toMediaWireUrl(part.data, mediaType),
          mediaType,
          ...(part.filename && { filename: part.filename }),
        };
      }
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
