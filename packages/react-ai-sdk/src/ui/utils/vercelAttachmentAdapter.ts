import type { AttachmentAdapter } from "@assistant-ui/core";
import { getFileDataURL } from "@assistant-ui/core/internal";
import { generateId } from "ai";

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
