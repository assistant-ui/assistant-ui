import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleAudioAttachmentAdapter implements AttachmentAdapter {
  public accept = "audio/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "audio",
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
    const format = getAudioFormat(attachment.file.type);

    // For mp3/wav files, use the native audio part
    if (format === "mp3" || format === "wav") {
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "audio",
            audio: {
              data: dataURL,
              format,
            },
          },
        ],
      };
    }

    // For other audio formats, fall back to file part
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

const getAudioFormat = (mimeType: string): "mp3" | "wav" | "other" => {
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") {
    return "mp3";
  }
  if (
    mimeType === "audio/wav" ||
    mimeType === "audio/wave" ||
    mimeType === "audio/x-wav"
  ) {
    return "wav";
  }
  return "other";
};
