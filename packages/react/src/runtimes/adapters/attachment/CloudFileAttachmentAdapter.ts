import {
  CompleteAttachment,
  PendingAttachment,
} from "../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";
import type { AssistantCloud } from "assistant-cloud";

export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*/*";

  constructor(private cloud: AssistantCloud) {}

  public async *add(state: { file: File }): AsyncGenerator<PendingAttachment, void> {
    const uploadPromise = this.startUpload(state.file);
    
    const baseAttachment: PendingAttachment = {
      id: `${state.file.name}-${Date.now()}`,
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "running", reason: "uploading", progress: 0 },
      uploadPromise,
    };

    yield baseAttachment;

    yield { ...baseAttachment, status: { type: "running", reason: "uploading", progress: 25 } };
    
    yield { ...baseAttachment, status: { type: "running", reason: "uploading", progress: 50 } };
    
    yield { ...baseAttachment, status: { type: "running", reason: "uploading", progress: 75 } };
    
    yield {
      ...baseAttachment,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    try {
      if (!attachment.uploadPromise) {
        throw new Error("No upload promise found on attachment");
      }

      const { data } = await attachment.uploadPromise;

      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data,
            mimeType: attachment.file.type,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async remove() {
  }

  private async startUpload(file: File): Promise<{ url: string; data: string }> {
    const uploadResponse = await this.cloud.files.generatePresignedUploadUrl({
      filename: file.name,
    });

    const uploadResult = await fetch(uploadResponse.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResult.ok) {
      throw new Error(`Upload failed: ${uploadResult.statusText}`);
    }

    const fileData = await this.fileToBase64(file);

    return {
      url: uploadResponse.signedUrl,
      data: fileData,
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64 || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
