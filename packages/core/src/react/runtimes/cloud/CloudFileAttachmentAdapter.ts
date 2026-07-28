import type { AssistantCloud } from "assistant-cloud";
import type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
} from "../../../types/attachment";
import type { ThreadUserMessagePart } from "../../../types/message";
import type { AttachmentAdapter } from "../../../adapters/attachment";
import { generateId } from "../../../utils/id";

const guessAttachmentType = (
  contentType: string,
): "image" | "document" | "file" => {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("text/")) return "document";
  return "file";
};

export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*";

  private getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  private uploadedUrls = new Map<
    string,
    { url: string; cloud: AssistantCloud }
  >();

  public async *add({
    file,
  }: {
    file: File;
  }): AsyncGenerator<PendingAttachment, void> {
    const id = generateId();
    const type = guessAttachmentType(file.type);
    let attachment: PendingAttachment = {
      id,
      type,
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
    yield attachment;

    try {
      const cloud = this.getCloud();
      const { signedUrl, publicUrl } =
        await cloud.files.generatePresignedUploadUrl({
          filename: file.name,
        });
      const res = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        mode: "cors",
      });
      if (!res.ok) {
        throw new Error(
          `Failed to upload file: ${res.status} ${res.statusText}`,
        );
      }
      this.uploadedUrls.set(id, { url: publicUrl, cloud });
      attachment = {
        ...attachment,
        status: { type: "requires-action", reason: "composer-send" },
      };
      yield attachment;
    } catch (error) {
      console.error("[assistant-ui] Failed to upload attachment:", error);
      attachment = {
        ...attachment,
        status: {
          type: "incomplete",
          reason: "error",
          message: error instanceof Error ? error.message : String(error),
        },
      };
      yield attachment;
    }
  }

  public async remove(attachment: Attachment): Promise<void> {
    this.uploadedUrls.delete(attachment.id);
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    const uploaded = this.uploadedUrls.get(attachment.id);
    if (!uploaded) throw new Error("Attachment not uploaded");
    this.uploadedUrls.delete(attachment.id);
    if (uploaded.cloud !== this.getCloud()) {
      throw new Error(
        "Attachment was uploaded with a different Cloud client. Remove it and upload it again.",
      );
    }

    let content: ThreadUserMessagePart[];
    if (attachment.type === "image") {
      content = [
        { type: "image", image: uploaded.url, filename: attachment.name },
      ];
    } else {
      content = [
        {
          type: "file",
          data: uploaded.url,
          mimeType: attachment.contentType ?? "",
          filename: attachment.name,
        },
      ];
    }

    return {
      ...attachment,
      status: { type: "complete" },
      content,
    };
  }
}
