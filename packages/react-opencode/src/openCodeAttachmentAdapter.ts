import {
  generateId,
  type AttachmentAdapter,
  type CompleteAttachment,
  type PendingAttachment,
} from "@assistant-ui/react";
import { getFileDataURL } from "@assistant-ui/core/internal";

const DEFAULT_ACCEPT = "image/*,application/pdf,text/*";

export type OpenCodeAttachmentAdapterOptions = {
  /**
   * File picker accept list. Defaults to the inputs OpenCode clients handle
   * natively (images, PDF, and text). Code files often carry an empty or
   * nonstandard browser MIME type, so widen this with extension entries
   * (for example `".ts,.py"`) when they should be pickable.
   */
  accept?: string | undefined;
};

/**
 * Converts browser files into standard assistant-ui attachments that preserve
 * OpenCode's native file semantics: the filename, MIME type, and payload ride
 * as an inline data url, and the thread controller turns the resulting message
 * part into an OpenCode `FilePartInput`. Capability decisions and request
 * failures stay owned by the OpenCode server.
 */
export class OpenCodeAttachmentAdapter implements AttachmentAdapter {
  public accept: string;

  constructor(options?: OpenCodeAttachmentAdapterOptions) {
    this.accept = options?.accept ?? DEFAULT_ACCEPT;
  }

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: generateId(),
      type: state.file.type.startsWith("image/") ? "image" : "file",
      name: state.file.name,
      contentType: state.file.type || "application/octet-stream",
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    const url = await getFileDataURL(attachment.file);
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        attachment.type === "image"
          ? {
              type: "image",
              image: url,
              filename: attachment.name,
            }
          : {
              type: "file",
              data: url,
              mimeType: attachment.contentType ?? "application/octet-stream",
              filename: attachment.name,
            },
      ],
    };
  }

  public async remove() {
    // noop
  }
}
