import { AssistantMessageStream } from "assistant-stream";

export const isTitleSourceMessage = (message: {
  status?: { type: string } | undefined;
}) => message.status?.type !== "running";

export const applyTitleStream = async (
  stream: Parameters<typeof AssistantMessageStream.fromAssistantStream>[0],
  onTitle: (title: string | undefined) => Promise<void>,
) => {
  const messageStream = AssistantMessageStream.fromAssistantStream(stream);
  for await (const result of messageStream) {
    const title = result.parts.filter((part) => part.type === "text")[0]?.text;
    if (title?.trim()) await onTitle(title);
  }
};
