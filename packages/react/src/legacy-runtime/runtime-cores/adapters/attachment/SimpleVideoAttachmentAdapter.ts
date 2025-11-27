import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit for video

export class SimpleVideoAttachmentAdapter implements AttachmentAdapter {
  public accept = "video/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    if (state.file.size > MAX_FILE_SIZE) {
      throw new Error(
        `Video file size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    return {
      id: crypto.randomUUID(),
      type: "video",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    const dataURL = await getFileDataURL(attachment.file);

    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          filename: attachment.file.name,
          data: dataURL,
          mimeType: attachment.file.type,
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
