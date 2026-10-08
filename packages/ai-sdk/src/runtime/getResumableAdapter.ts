import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import type { AssistantChatResumableOptions } from "../transport/resumable";

export const getResumableAdapter = <UI_MESSAGE extends UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): AssistantChatResumableOptions | undefined => {
  if (transport instanceof AssistantChatTransport) {
    return transport.getResumableAdapter();
  }
  const candidate = (transport as { getResumableAdapter?: () => unknown })
    .getResumableAdapter;
  if (typeof candidate !== "function") return undefined;
  return candidate.call(transport) as AssistantChatResumableOptions | undefined;
};
