import type { AttachmentAdapter } from "@assistant-ui/core";
import { generateId } from "ai";

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const getFileDataURL = async (file: File): Promise<string> => {
  if (typeof FileReader !== "undefined") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);

      reader.readAsDataURL(file);
    });
  }

  const buffer = await file.arrayBuffer();
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(buffer).toString("base64")
      : bytesToBase64(new Uint8Array(buffer));
  return `data:${file.type || "application/octet-stream"};base64,${base64}`;
};

export const vercelAttachmentAdapter: AttachmentAdapter = {
  accept: "*",
  async add({ file }) {
    return {
      id: generateId(),
      type: file.type.startsWith("image/") ? "image" : "file",
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
        {
          type: "file",
          mimeType: attachment.contentType ?? "",
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
