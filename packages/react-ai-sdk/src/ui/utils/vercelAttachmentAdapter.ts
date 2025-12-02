import { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "ai";

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });

const getAudioFormat = (mimeType: string): "mp3" | "wav" | "other" => {
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") {
    return "mp3";
  }
  if (
    mimeType === "audio/wav" ||
    mimeType === "audio/wave" ||
    mimeType === "audio/x-wav"
  ) {
    return "wav";
  }
  return "other";
};

const getAudioContent = async (attachment: {
  file: File;
  contentType: string;
  name: string;
}) => {
  const dataURL = await getFileDataURL(attachment.file);
  const format = getAudioFormat(attachment.contentType);

  // For mp3/wav files, use the native audio part
  if (format === "mp3" || format === "wav") {
    return {
      type: "audio" as const,
      audio: {
        data: dataURL,
        format,
      },
    };
  }

  // For other audio formats, fall back to file part
  return {
    type: "file" as const,
    filename: attachment.name,
    data: dataURL,
    mimeType: attachment.contentType,
  };
};

export const vercelAttachmentAdapter: AttachmentAdapter = {
  accept:
    "image/*, video/*, audio/*, text/plain, text/html, text/markdown, text/csv, text/xml, text/json, text/css, application/pdf",
  async add({ file }) {
    return {
      id: generateId(),
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "file",
      name: file.name,
      file,
      contentType: file.type,
      content: [],
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
  async send(attachment) {
    // noop
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        attachment.type === "image"
          ? {
              type: "image",
              image: await getFileDataURL(attachment.file),
            }
          : attachment.type === "audio"
            ? await getAudioContent(attachment)
            : {
                type: "file",
                mimeType: attachment.contentType,
                filename: attachment.name,
                data: await getFileDataURL(attachment.file),
              },
      ],
    };
  },
  async remove() {
    // noop
  },
};
