import {
  ThreadComposerAttachment,
  MessageAttachment,
} from "../../context/stores/Attachment";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleTextAttachmentAdapter implements AttachmentAdapter {
  public accept =
    "text/plain,text/html,text/markdown,text/csv,text/xml,text/json,text/css";

  public async add(state: { file: File }): Promise<ThreadComposerAttachment> {
    return {
      id: state.file.name,
      type: "document",
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
          type: "text",
          text: `<attachment name=${attachment.name}>\n${await getFileText(attachment.file)}\n</attachment>`,
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsText(file);
  });
