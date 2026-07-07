export type DataStreamProtocol = "ui-message-stream" | "data-stream";

const VERCEL_AI_DATA_STREAM_HEADER = "x-vercel-ai-data-stream";

export const resolveDataStreamProtocol = (
  headers: Headers,
  protocol?: DataStreamProtocol,
): DataStreamProtocol => {
  if (protocol) return protocol;

  return headers.get(VERCEL_AI_DATA_STREAM_HEADER)?.trim() === "v1"
    ? "data-stream"
    : "ui-message-stream";
};
