"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  McpAppRenderer,
  McpAppsRemoteHost,
  Tools,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantShell } from "@/components/assistant-ui/assistant-shell";
import { MessagesSquare } from "lucide-react";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  const config = AuiConfig({
    tools: Tools({
      mcpApp: McpAppRenderer({
        host: McpAppsRemoteHost({ url: "/api/mcp-apps" }),
        hostInfo: { name: "assistant-ui-starter-mcp", version: "0.1.0" },
      }),
    }),
  });

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <AssistantShell
        logo={<MessagesSquare className="size-5" />}
        title="assistant-ui"
      >
        <Thread />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
};
