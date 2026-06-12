"use client";

import { useMemo } from "react";
import { Box, Text } from "ink";
import {
  AssistantRuntimeProvider,
  StatusBarPrimitive,
  useAui,
} from "@assistant-ui/react-ink";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "./thread";

const CHAT_API =
  process.env.NEXT_PUBLIC_CHAT_ENDPOINT_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/chat"
    : "https://www.assistant-ui.com/api/chat");

const MODEL_NAME = "assistant-ui";

export const InkApp = () => {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: CHAT_API }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const aui = useAui();

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text bold color="cyan">
            {MODEL_NAME}
          </Text>
          <Text dimColor>{"  ~/assistant-ui"}</Text>
        </Box>
        <StatusBarPrimitive.Root>
          <Text dimColor>
            model: <StatusBarPrimitive.ModelName name={MODEL_NAME} /> ·{" "}
            <StatusBarPrimitive.MessageCount /> · <StatusBarPrimitive.Status />
          </Text>
        </StatusBarPrimitive.Root>
        <Box marginTop={1}>
          <Thread />
        </Box>
      </Box>
    </AssistantRuntimeProvider>
  );
};
