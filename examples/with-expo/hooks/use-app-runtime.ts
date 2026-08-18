import { useMemo } from "react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

const CHAT_API = process.env.EXPO_PUBLIC_CHAT_ENDPOINT_URL ?? "/api/chat";
const ANONYMOUS_SESSION_HEADER = "x-assistant-ui-anonymous-session";

function createAnonymousSessionFetch(chatApi: string): typeof fetch {
  let tokenPromise: Promise<string> | null = null;

  const getToken = () => {
    tokenPromise ??= (async () => {
      const endpoint = chatApi.startsWith("http")
        ? new URL("/api/anonymous-session", chatApi)
        : "/api/anonymous-session";
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

export function useAppRuntime() {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: CHAT_API,
        ...(CHAT_API.startsWith("http")
          ? { fetch: createAnonymousSessionFetch(CHAT_API) }
          : {}),
      }),
    [],
  );
  return useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
}
