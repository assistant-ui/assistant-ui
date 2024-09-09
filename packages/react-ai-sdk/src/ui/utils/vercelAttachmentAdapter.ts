import { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "ai";

export const vercelAttachmentAdapter: AttachmentAdapter = {
  accept:
    "image/*, text/plain, text/html, text/markdown, text/csv, text/xml, text/json, text/css",
  async add({ file }) {
    return {
      id: generateId(),
      type: "file",
      name: file.name,
      file,
      content: [],
    };
  },
  async send(attachment) {
    // noop
    return {
      ...attachment,
      content: [],
    };
  },
  async remove() {
    // noop
  },
};
