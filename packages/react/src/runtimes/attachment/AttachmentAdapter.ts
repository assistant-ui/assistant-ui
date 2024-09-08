import { Attachment } from "../../context/stores/Attachment";
import { CoreUserContentPart } from "../../types";

export type AttachmentAdapter = {
  add(state: { file: File }): Promise<Attachment>;
  send(attachment: Attachment): Promise<{
    content: CoreUserContentPart[];
  }>;
  remove(attachment: Attachment): Promise<void>;
};
