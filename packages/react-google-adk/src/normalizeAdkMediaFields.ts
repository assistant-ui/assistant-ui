import { isRecord } from "@assistant-ui/core/internal";

export const normalizeAdkMediaFields = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...value };
  if ("inline_data" in value && !("inlineData" in value))
    result.inlineData = value.inline_data;
  if ("file_data" in value && !("fileData" in value))
    result.fileData = value.file_data;
  if (isRecord(result.inlineData)) {
    const data = result.inlineData;
    if ("mime_type" in data && !("mimeType" in data))
      result.inlineData = { ...data, mimeType: data.mime_type };
  }
  if (isRecord(result.fileData)) {
    const data = result.fileData;
    result.fileData = {
      ...data,
      ...("mime_type" in data &&
        !("mimeType" in data) && { mimeType: data.mime_type }),
      ...("file_uri" in data &&
        !("fileUri" in data) && {
          fileUri: data.file_uri,
        }),
    };
  }
  return result;
};
