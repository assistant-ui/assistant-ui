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
