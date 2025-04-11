import { AppendMessage } from "@assistant-ui/react";
import { CreateMessage } from "@ai-sdk/ui-utils";

export const toCreateMessage = async (
  message: AppendMessage,
): Promise<CreateMessage> => {
  const content = message.content
    .filter((part) => part.type === "text")
    .map((t) => t.text)
    .join("\n\n");

  const images = message.content
    .filter((part) => part.type === "image")
    .map((part) => ({ url: part.image }));

  return {
    role: message.role,
    content,
    experimental_attachments: [
      ...images,
      ...(await Promise.all(
        (message.attachments ?? []).map(async (m) => {
          if (m.file == null)
            throw new Error("Attachment did not contain a file");
          return {
            contentType: m.file.type,
            name: m.file.name,
            url: await getFileDataURL(m.file),
          };
        }),
      )),
    ],
  };
};

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
