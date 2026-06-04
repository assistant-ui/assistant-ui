import type {
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/core";

export class SimpleTextAttachmentAdapter implements AttachmentAdapter {
  accept =
    "text/plain,text/html,text/markdown,text/csv,text/xml,text/json,text/css";

  async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "text",
          text: `<attachment name=${attachment.name}>\n${await attachment.file.text()}\n</attachment>`,
        },
      ],
    };
  }

  async remove() {}
}

export class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  accept = "image/*";

  async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "image",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const bytes = await attachment.file.arrayBuffer();
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image: `data:${attachment.file.type};base64,${Buffer.from(bytes).toString("base64")}`,
        },
      ],
    };
  }

  async remove() {}
}
