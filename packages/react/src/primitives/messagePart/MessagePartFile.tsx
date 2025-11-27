"use client";

import { type FC } from "react";
import { useMessagePartFile } from "./useMessagePartFile";

export namespace MessagePartPrimitiveFile {
  export type Props = Record<string, never>;
}

const getFileType = (
  mimeType: string,
): "audio" | "video" | "document" | null => {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  // For now, treat anything else as a document
  return "document";
};

/**
 * Renders audio/video file content parts using HTML5 audio/video elements.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.File />
 * ```
 */
export const MessagePartPrimitiveFile: FC<
  MessagePartPrimitiveFile.Props
> = () => {
  const file = useMessagePartFile();

  const fileType = getFileType(file.mimeType);
  const url = file.data;
  const name = file.filename || "file";

  if (fileType === "audio") {
    return (
      <audio
        controls
        src={url}
        preload="metadata"
        className="aui-message-file-audio"
      />
    );
  }

  if (fileType === "video") {
    return (
      <video
        controls
        src={url}
        preload="metadata"
        className="aui-message-file-video"
      />
    );
  }

  if (fileType === "document") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={name}
        className="aui-message-file-document"
      >
        {name}
      </a>
    );
  }

  return null;
};

MessagePartPrimitiveFile.displayName = "MessagePrimitive.File";
