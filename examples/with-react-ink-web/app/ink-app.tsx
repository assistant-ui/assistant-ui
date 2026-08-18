"use client";

// Mirrors examples/with-react-ink/src/app.tsx; keep in sync.
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
const ANONYMOUS_SESSION_HEADER = "x-assistant-ui-anonymous-session";

function createAnonymousSessionFetch(chatApi: string): typeof fetch {
  let tokenPromise: Promise<string> | null = null;

  const getToken = () => {
    tokenPromise ??= (async () => {
      const endpoint = new URL(chatApi, window.location.origin);
      endpoint.pathname = "/api/anonymous-session";
      endpoint.search = "";
      const response = await fetch(endpoint, { credentials: "omit" });
      if (!response.ok) throw new Error("Unable to start an anonymous session");
      const payload = (await response.json()) as { token?: unknown };
      if (typeof payload.token !== "string") {
        throw new Error("Invalid anonymous session response");
      }
      return payload.token;
    })().catch((error: unknown) => {
      tokenPromise = null;
      throw error;
    });
    return tokenPromise;
  };

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set(ANONYMOUS_SESSION_HEADER, await getToken());
    const response = await fetch(input, { ...init, headers });
    if (response.status !== 401) return response;

    tokenPromise = null;
    headers.set(ANONYMOUS_SESSION_HEADER, await getToken());
    return fetch(input, { ...init, headers });
  };
}

export const InkApp = () => {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: CHAT_API,
        fetch: createAnonymousSessionFetch(CHAT_API),
      }),
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
