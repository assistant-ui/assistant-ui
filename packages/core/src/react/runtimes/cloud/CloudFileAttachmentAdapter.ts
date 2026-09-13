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

type ScopeBinding = {
  getScope: () => unknown;
  subscribe?: ((listener: (scope: unknown) => void) => () => void) | undefined;
};

const scopeBindings = new WeakMap<CloudFileAttachmentAdapter, ScopeBinding>();

export const createScopedCloudFileAttachmentAdapter = (
  getCloud: () => AssistantCloud,
  getScope: () => unknown,
  subscribe?: (listener: (scope: unknown) => void) => () => void,
) => {
  const adapter = new CloudFileAttachmentAdapter(getCloud);
  scopeBindings.set(adapter, { getScope, subscribe });
  return adapter;
};

export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*";

  private getCloud: () => AssistantCloud;
  private readonly defaultScope = {};

  constructor(cloud: AssistantCloud);
  constructor(getCloud: () => AssistantCloud);
  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  private getScope = () =>
    scopeBindings.get(this)?.getScope() ?? this.defaultScope;

  private uploadedUrls = new Map<string, { url: string; scope: unknown }>();
  private activeUploads = new Map<
    string,
    {
      cancelled: boolean;
      controller: AbortController;
      unsubscribe: () => void;
    }
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
    const upload = { cancelled: false, controller, unsubscribe: () => {} };
    const cloud = this.getCloud();
    const scope = this.getScope();
    let scopeChanged = false;
    upload.unsubscribe =
      scopeBindings.get(this)?.subscribe?.((nextScope) => {
        if (Object.is(scope, nextScope)) return;
        scopeChanged = true;
        upload.unsubscribe();
        controller.abort();
      }) ?? upload.unsubscribe;
    this.activeUploads.set(id, upload);

    try {
      yield attachment;
      if (upload.cancelled) return;
      if (scopeChanged) {
        throw new Error("Cloud scope changed while uploading the attachment");
      }

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

      const failure = scopeChanged
        ? new Error("Cloud scope changed while uploading the attachment")
        : error;
      console.error("[assistant-ui] Failed to upload attachment:", failure);
      attachment = {
        ...attachment,
        status: {
          type: "incomplete",
          reason: "error",
          message: failure instanceof Error ? failure.message : String(failure),
        },
      };
      yield attachment;
    } finally {
      upload.unsubscribe();
      if (this.activeUploads.get(id) === upload) {
        this.activeUploads.delete(id);
      }
    }
  }

  public async remove(attachment: Attachment): Promise<void> {
    const upload = this.activeUploads.get(attachment.id);
    if (upload) {
      upload.cancelled = true;
      upload.unsubscribe();
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
    if (!Object.is(uploaded.scope, this.getScope())) {
      throw new Error("Attachment was uploaded for a different Cloud scope");
    }
    this.uploadedUrls.delete(attachment.id);
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
