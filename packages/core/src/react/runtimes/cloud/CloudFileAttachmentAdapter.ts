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

const scopeGetters = new WeakMap<CloudFileAttachmentAdapter, () => unknown>();

export const createScopedCloudFileAttachmentAdapter = (
  getCloud: () => AssistantCloud,
  getScope: () => unknown,
) => {
  const adapter = new CloudFileAttachmentAdapter(getCloud);
  scopeGetters.set(adapter, getScope);
  return adapter;
};

export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*";

  private getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  private getScope = () => scopeGetters.get(this)?.() ?? this.getCloud();

  private uploadedUrls = new Map<string, { url: string; scope: unknown }>();
  private activeUploads = new Map<
    string,
    { cancelled: boolean; controller: AbortController }
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
    const controller = new AbortController();
    const upload = { cancelled: false, controller };
    const cloud = this.getCloud();
    const scope = this.getScope();
    this.activeUploads.set(id, upload);

    try {
      yield attachment;
      if (upload.cancelled) return;

      const { signedUrl, publicUrl } =
        await cloud.files.generatePresignedUploadUrl({
          filename: file.name,
        });
      if (upload.cancelled) return;
      if (!Object.is(scope, this.getScope())) {
        throw new Error("Cloud scope changed while uploading the attachment");
      }

      const res = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        mode: "cors",
        signal: controller.signal,
      });
      if (upload.cancelled) return;
      if (!Object.is(scope, this.getScope())) {
        throw new Error("Cloud scope changed while uploading the attachment");
      }

      if (!res.ok) {
        throw new Error(
          `Failed to upload file: ${res.status} ${res.statusText}`,
        );
      }
      this.uploadedUrls.set(id, { url: publicUrl, scope });
      attachment = {
        ...attachment,
        status: { type: "requires-action", reason: "composer-send" },
      };
      yield attachment;
    } catch (error) {
      if (upload.cancelled) return;

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
    } finally {
      if (this.activeUploads.get(id) === upload) {
        this.activeUploads.delete(id);
      }
    }
  }

  public async remove(attachment: Attachment): Promise<void> {
    const upload = this.activeUploads.get(attachment.id);
    if (upload) {
      upload.cancelled = true;
      upload.controller.abort();
      this.activeUploads.delete(attachment.id);
    }
    this.uploadedUrls.delete(attachment.id);
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    const uploaded = this.uploadedUrls.get(attachment.id);
    if (!uploaded) throw new Error("Attachment not uploaded");
    this.uploadedUrls.delete(attachment.id);
    if (!Object.is(uploaded.scope, this.getScope())) {
      throw new Error("Attachment was uploaded for a different Cloud scope");
    }
    const { url } = uploaded;

    let content: ThreadUserMessagePart[];
    if (attachment.type === "image") {
      content = [{ type: "image", image: url, filename: attachment.name }];
    } else {
      content = [
        {
          type: "file",
          data: url,
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
