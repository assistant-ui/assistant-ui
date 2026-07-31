import type { AppendMessage } from "@assistant-ui/core";
import {
  dataUrlMediaType,
  detectImageMediaType,
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

// A data URL's own media type wins over `mediaType` downstream, so an envelope
// that disagrees with the resolved type is rebuilt. One that agrees, and a url
// of any other scheme, passes through byte for byte.
const toWireUrl = (payload: string, mediaType: string) => {
  const parsed = parseDataUrl(payload);
  if (parsed) {
    return parsed.mimeType === mediaType
      ? payload
      : `data:${mediaType};base64,${parsed.data}`;
  }
  if (isParsableUrl(payload)) return payload;
  return `data:${mediaType};base64,${payload}`;
};

const getImageMediaType = (part: {
  readonly contentType?: string | undefined;
  readonly image: string;
}) => {
  if (part.contentType?.startsWith("image/")) return part.contentType;

  const envelopeType = dataUrlMediaType(part.image);
  if (envelopeType?.startsWith("image/")) return envelopeType;

  // The payload's own leading bytes, read through a data URL envelope too so a
  // generic one such as `application/octet-stream` does not mask the format.
  // Only a url of some other scheme has no bytes to read here.
  const parsed = parseDataUrl(part.image);
  const payload =
    parsed?.data ?? (isParsableUrl(part.image) ? undefined : part.image);
  if (payload !== undefined) {
    const sniffed = detectImageMediaType(payload);
    if (sniffed) return sniffed;
  }

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
          url: toWireUrl(part.image, mediaType),
          ...(part.filename && { filename: part.filename }),
          mediaType,
        };
      }
      case "file": {
        // `mimeType` is a plain string, and an adapter reading `file.type` on a
        // file the OS cannot type yields "". Same ladder as images: declared,
        // then the envelope, then the floor.
        const mediaType =
          part.mimeType ||
          dataUrlMediaType(part.data) ||
          "application/octet-stream";
        return {
          type: "file",
          // An `id` reference is an opaque provider handle, not base64, and
          // this adapter has no way to send one. Left unwrapped so it fails
          // loudly upstream rather than shipping a corrupt payload.
          url:
            part.sourceType === "id"
              ? part.data
              : toWireUrl(part.data, mediaType),
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
