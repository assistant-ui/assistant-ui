import type { MastraClient } from "@mastra/client-js";
import type { ThreadMessage } from "@assistant-ui/react";
import type { ChatTransport, UIMessage } from "ai";
import type { UseChatRuntimeOptions } from "@assistant-ui/react-ai-sdk";
import type { createMastraChatTransport } from "./createMastraChatTransport";

export type MastraTitleGenerator = (
  messages: readonly ThreadMessage[],
) => string | Promise<string>;

export type MastraThreadListOptions = {
  client: MastraClient;
  agentId: string;
  resourceId: string;
  perPage?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
  titleGenerator?: MastraTitleGenerator | undefined;
};

export type MastraChatTransportOptions<
  UI_MESSAGE extends UIMessage = UIMessage,
> = NonNullable<
  ConstructorParameters<
    typeof import("@assistant-ui/react-ai-sdk").AssistantChatTransport<UI_MESSAGE>
  >[0]
> & {
  resourceId: string;
};

export type UseMastraRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<UseChatRuntimeOptions<UI_MESSAGE>, "cloud" | "transport"> &
    MastraThreadListOptions & {
      threadId?: string | undefined;
      transport?: ChatTransport<UI_MESSAGE> | undefined;
      transportOptions?: Omit<
        Parameters<typeof createMastraChatTransport<UI_MESSAGE>>[0],
        "resourceId"
      >;
    };
