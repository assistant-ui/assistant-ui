import {
  CompleteAttachment,
  PendingAttachment,
} from "../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";
import type { AssistantCloud } from "assistant-cloud";

export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*/*";

  constructor(private cloud: AssistantCloud) {}

  public async *add(state: {
    file: File;
  }): AsyncGenerator<PendingAttachment, void> {
    let currentProgress = 0;
    let progressResolvers: Array<(progress: number) => void> = [];

    const uploadPromise = this.startUploadWithProgress(
      state.file,
      (progress) => {
        currentProgress = progress;
        progressResolvers.forEach((resolver) => resolver(progress));
        progressResolvers = [];
      },
    );

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

    let lastYieldedProgress = 0;
    while (currentProgress < 100) {
      const nextProgress = await new Promise<number>((resolve) => {
        if (currentProgress > lastYieldedProgress) {
          resolve(currentProgress);
        } else {
          progressResolvers.push(resolve);
          setTimeout(() => resolve(currentProgress), 100);
        }
      });

      if (nextProgress > lastYieldedProgress + 4 || nextProgress >= 100) {
        lastYieldedProgress = nextProgress;

        if (nextProgress < 100) {
          yield {
            ...baseAttachment,
            status: {
              type: "running",
              reason: "uploading",
              progress: nextProgress,
            },
          };
        } else {
          break;
        }
      }
    }

    yield {
      ...baseAttachment,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
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
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async remove() {}

  private async startUploadWithProgress(
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<{ url: string; data: string }> {
    const uploadResponse = await this.cloud.files.generatePresignedUploadUrl({
      filename: file.name,
    });

    const uploadResult = await new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(
            new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
            }),
          );
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed: Network error"));
      });

      xhr.open("PUT", uploadResponse.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
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
        const base64 = result.split(",")[1];
        resolve(base64 || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
