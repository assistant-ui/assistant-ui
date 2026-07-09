export type DataStreamProtocol = "ui-message-stream" | "data-stream";

type DataStreamProtocolSource =
  | "explicit"
  | "data-stream-header"
  | "ui-message-stream-header"
  | "fallback";

type DataStreamProtocolResolution = {
  protocol: DataStreamProtocol;
  source: DataStreamProtocolSource;
};

const VERCEL_AI_DATA_STREAM_HEADER = "x-vercel-ai-data-stream";
const VERCEL_AI_UI_MESSAGE_STREAM_HEADER = "x-vercel-ai-ui-message-stream";

const isV1Header = (headers: Headers, header: string) =>
  headers.get(header)?.trim() === "v1";

export const resolveDataStreamProtocol = (
  headers: Headers,
  protocol?: DataStreamProtocol,
): DataStreamProtocolResolution => {
  if (protocol) return { protocol, source: "explicit" };

  if (isV1Header(headers, VERCEL_AI_DATA_STREAM_HEADER)) {
    return { protocol: "data-stream", source: "data-stream-header" };
  }
  if (isV1Header(headers, VERCEL_AI_UI_MESSAGE_STREAM_HEADER)) {
    return {
      protocol: "ui-message-stream",
      source: "ui-message-stream-header",
    };
  }

  return { protocol: "ui-message-stream", source: "fallback" };
};
