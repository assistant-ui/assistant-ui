import { AssistantMessageStream } from "assistant-stream";

type TitleSourceMessage = {
  role?: string | undefined;
  content?: readonly {
    type: string;
    text?: string | undefined;
  }[];
  status?: { type: string } | undefined;
};

export const isTitleSourceMessage = (message: {
  status?: { type: string } | undefined;
}) => message.status?.type !== "running";

export const hasTitleSourceMessages = (
  messages: readonly TitleSourceMessage[],
) => {
  let hasTextUser = false;
  let hasAssistant = false;

  for (const message of messages) {
    if (!isTitleSourceMessage(message)) continue;
    if (message.role === "assistant") hasAssistant = true;
    if (
      message.role === "user" &&
      message.content?.some(
        (part) => part.type === "text" && part.text?.trim() !== "",
      )
    ) {
      hasTextUser = true;
    }
  }

  return hasTextUser && hasAssistant;
};

export const applyTitleStream = async (
  stream: Parameters<typeof AssistantMessageStream.fromAssistantStream>[0],
  onTitle: (title: string | undefined) => Promise<void>,
): Promise<boolean> => {
  const messageStream = AssistantMessageStream.fromAssistantStream(stream);
  let sawTitle = false;
  for await (const result of messageStream) {
    const title = result.parts.filter((part) => part.type === "text")[0]?.text;
    if (title?.trim()) {
      sawTitle = true;
      await onTitle(title);
    }
  }
  return sawTitle;
};
