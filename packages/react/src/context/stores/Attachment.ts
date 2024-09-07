export type Attachment = {
  id: string;
  type: "image" | "document" | "file";
  name: string;

  file?: File;
};

export type AttachmentState = Readonly<{
  attachment: Attachment;
}>;
