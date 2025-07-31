import { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "@ai-sdk/ui-utils";

export const vercelAttachmentAdapter: AttachmentAdapter = {
  accept:
    "image/*, text/plain, text/html, text/markdown, text/csv, text/xml, text/json, text/css",
  async add({ file }) {
    return {
      id: generateId(),
      type: "file",
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
      content: [],
    };
  },
  async remove() {
    // noop
  },
};
