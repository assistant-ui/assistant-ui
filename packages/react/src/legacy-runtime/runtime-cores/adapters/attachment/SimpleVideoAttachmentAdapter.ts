import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleVideoAttachmentAdapter implements AttachmentAdapter {
  public accept = "video/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
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
