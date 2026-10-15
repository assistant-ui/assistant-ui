import { isRecord } from "@assistant-ui/core/internal";

export const normalizeAdkPart = (
  part: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...part };
  if ("function_call" in part && !("functionCall" in part))
    result.functionCall = part.function_call;
  if ("function_response" in part && !("functionResponse" in part))
    result.functionResponse = part.function_response;
  if ("inline_data" in part && !("inlineData" in part))
    result.inlineData = part.inline_data;
  if ("file_data" in part && !("fileData" in part))
    result.fileData = part.file_data;
  if (isRecord(result.inlineData)) {
    const data = result.inlineData;
    result.inlineData = {
      ...data,
      ...("mime_type" in data &&
        !("mimeType" in data) && { mimeType: data.mime_type }),
      ...("display_name" in data &&
        !("displayName" in data) && { displayName: data.display_name }),
    };
  }
  if (isRecord(result.fileData)) {
    const data = result.fileData;
    result.fileData = {
      ...data,
      ...("mime_type" in data &&
        !("mimeType" in data) && { mimeType: data.mime_type }),
      ...("file_uri" in data &&
        !("fileUri" in data) && { fileUri: data.file_uri }),
      ...("display_name" in data &&
        !("displayName" in data) && { displayName: data.display_name }),
    };
  }
  if ("executable_code" in part && !("executableCode" in part))
    result.executableCode = part.executable_code;
  if ("code_execution_result" in part && !("codeExecutionResult" in part))
    result.codeExecutionResult = part.code_execution_result;
  return result;
};
