import {
  ThreadComposerAttachment,
  MessageAttachment,
} from "../../context/stores/Attachment";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/*";

  public async add(state: { file: File }): Promise<ThreadComposerAttachment> {
    return {
      id: state.file.name,
      type: "image",
      name: state.file.name,
      file: state.file,
    };
  }

  public async send(
    attachment: ThreadComposerAttachment,
  ): Promise<MessageAttachment> {
    return {
      ...attachment,
      content: [
        {
          type: "image",
          image: await getFileDataURL(attachment.file),
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
