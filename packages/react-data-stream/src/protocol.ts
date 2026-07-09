export type DataStreamProtocol = "ui-message-stream" | "data-stream";

const VERCEL_AI_DATA_STREAM_HEADER = "x-vercel-ai-data-stream";
const VERCEL_AI_UI_MESSAGE_STREAM_HEADER = "x-vercel-ai-ui-message-stream";

const isV1Header = (headers: Headers, header: string) =>
  headers.get(header)?.trim() === "v1";

export const resolveDataStreamProtocol = (
  headers: Headers,
  protocol?: DataStreamProtocol,
): DataStreamProtocol => {
  if (protocol) return protocol;

  if (isV1Header(headers, VERCEL_AI_DATA_STREAM_HEADER)) return "data-stream";
  if (isV1Header(headers, VERCEL_AI_UI_MESSAGE_STREAM_HEADER)) {
    return "ui-message-stream";
  }

  return "ui-message-stream";
};
