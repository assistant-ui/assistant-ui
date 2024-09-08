import { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "ai";

export const vercelAttachmentAdapter: AttachmentAdapter = {
  async add({ file }) {
    return {
      id: generateId(),
      type: "file",
      name: file.name,
      file,
    };
  },
  async send() {
    // noop
    return { content: [] };
  },
  async remove() {
    // noop
  },
};
