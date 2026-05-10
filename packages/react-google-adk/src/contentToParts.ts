import type { AdkEventPart, AdkMessage, AdkMessageContentPart } from "./types";

export const contentToParts = (
  content: AdkMessage["content"],
): AdkEventPart[] => {
  if (typeof content === "string") return [{ text: content }];
  return (content as AdkMessageContentPart[]).map((part): AdkEventPart => {
    switch (part.type) {
      case "text":
        return { text: part.text };
      case "reasoning":
        return { text: part.text, thought: true };
      case "image":
        return { inlineData: { mimeType: part.mimeType, data: part.data } };
      case "image_url":
        return { fileData: { fileUri: part.url } };
      case "file":
        return { inlineData: { mimeType: part.mimeType, data: part.data } };
      case "file_url":
        return {
          fileData: {
            fileUri: part.url,
            ...(part.mimeType != null && { mimeType: part.mimeType }),
          },
        };
      case "code":
        return {
          executableCode: { code: part.code, language: part.language },
        };
      case "code_result":
        return {
          codeExecutionResult: { output: part.output, outcome: part.outcome },
        };
      default:
        return { text: "" };
    }
  });
};
