import { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "ai";

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });

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
    const dataURL = await getFileDataURL(attachment.file);

    // Handle image attachments
    if (attachment.type === "image") {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [{ type: "image", image: dataURL }],
      };
    }

    // Handle audio attachments - use native audio part for mp3/wav
    if (attachment.type === "audio") {
      const mimeType = attachment.contentType;
      const isMP3 = mimeType === "audio/mpeg" || mimeType === "audio/mp3";
      const isWAV =
        mimeType === "audio/wav" ||
        mimeType === "audio/wave" ||
        mimeType === "audio/x-wav";

      if (isMP3 || isWAV) {
        return {
          ...attachment,
          status: { type: "complete" },
          content: [
            {
              type: "audio",
              audio: {
                data: dataURL,
                format: isMP3 ? "mp3" : "wav",
              },
            },
          ],
        };
      }
    }

    // Fall back to file part for video, documents, and unsupported audio formats
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          mimeType: attachment.contentType,
          filename: attachment.name,
          data: dataURL,
        },
      ],
    };
  },
  async remove() {
    // noop
  },
};
