import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import type { MastraChatTransportOptions } from "./types";

export const createMastraChatTransport = <
  UI_MESSAGE extends UIMessage = UIMessage,
>({
  resourceId,
  prepareSendMessagesRequest,
  ...options
}: MastraChatTransportOptions<UI_MESSAGE>) =>
  new AssistantChatTransport<UI_MESSAGE>({
    ...options,
    prepareSendMessagesRequest: async (request) => {
      const prepared = await prepareSendMessagesRequest?.(request);
      return {
        ...prepared,
        body: {
          ...request.body,
          id: request.id,
          messages: request.messages,
          trigger: request.trigger,
          messageId: request.messageId,
          metadata: request.requestMetadata,
          ...prepared?.body,
          memory: {
            thread: request.id,
            resource: resourceId,
          },
        },
      };
    },
  });
