"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getPendingStreamId,
  setPendingStreamId,
  storeUserMessages,
  getStoredUserMessages,
  clearAllResumableState,
  parseStreamToText,
} from "@/lib/resumable-transport";

type Notification = {
  type: "info" | "success" | "error";
  message: string;
} | null;

function createRestoredMessages(
  storedMessages: UIMessage[],
  aiText: string,
): UIMessage[] {
  const lastUserMessage = storedMessages[storedMessages.length - 1];
  if (!lastUserMessage) return [];

  const userText =
    lastUserMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  if (!userText) return [];

  return [
    {
      id: `restored-user-${Date.now()}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: userText }],
    },
    {
      id: `restored-assistant-${Date.now()}`,
      role: "assistant" as const,
      parts: [
        {
          type: "text" as const,
          text: aiText || "(Response was interrupted)",
        },
      ],
    },
  ];
}

function ChatUI({
  initialMessages,
  notification,
  setNotification,
}: {
  initialMessages: UIMessage[];
  notification: Notification;
  setNotification: (n: Notification) => void;
}) {
  const transport = useMemo(() => {
    return new AssistantChatTransport({
      api: "/api/chat",
      fetch: async (url, options) => {
        try {
          if (options?.body) {
            const body = JSON.parse(options.body as string);
            if (body.messages) {
              storeUserMessages(body.messages);
            }
          }
        } catch {
          // noop
        }

        const response = await fetch(url, options);

        const streamId = response.headers.get("X-Stream-Id");
        if (streamId) {
          setPendingStreamId(streamId);
        }

        const originalBody = response.body;
        if (originalBody) {
          const transformStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              controller.enqueue(chunk);
            },
            flush() {
              clearAllResumableState();
            },
          });

          return new Response(originalBody.pipeThrough(transformStream), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

        return response;
      },
    });
  }, []);

  const runtime = useChatRuntime({
    transport,
    ...(initialMessages.length > 0 && { messages: initialMessages }),
  });

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, [setNotification]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="relative h-full">
        {notification && (
          <div
            className={cn(
              "absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2 text-white shadow-lg",
              notification.type === "success" && "bg-green-500",
              notification.type === "error" && "bg-red-500",
              notification.type === "info" && "bg-blue-500",
            )}
          >
            {notification.type === "info" && (
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>
              {notification.type === "success" && "✓ "}
              {notification.type === "error" && "✕ "}
              {notification.message}
            </span>
            {notification.type !== "info" && (
              <button
                onClick={dismissNotification}
                className={cn(
                  "ml-2 rounded p-1",
                  notification.type === "success" && "hover:bg-green-600",
                  notification.type === "error" && "hover:bg-red-600",
                )}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function Home() {
  const [notification, setNotification] = useState<Notification>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );

  useEffect(() => {
    const pendingStreamId = getPendingStreamId();
    const storedMessages = getStoredUserMessages();

    if (!pendingStreamId || !storedMessages || storedMessages.length === 0) {
      clearAllResumableState();
      setInitialMessages([]);
      return;
    }

    setNotification({ type: "info", message: "Resuming previous session..." });

    fetch(`/api/chat/resume/${pendingStreamId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Resume failed: ${response.status}`);
        }

        const aiText = await parseStreamToText(response);
        const restored = createRestoredMessages(storedMessages, aiText);

        setInitialMessages(restored);

        if (restored.length > 0) {
          setNotification({
            type: "success",
            message: aiText
              ? "Session restored successfully"
              : "Session restored (response was interrupted)",
          });
        } else {
          setNotification(null);
        }

        clearAllResumableState();
        setTimeout(() => setNotification(null), 3000);
      })
      .catch((error) => {
        console.error("[Resumable Stream] Failed to resume:", error);
        setInitialMessages([]);
        setNotification({
          type: "error",
          message: `Failed to resume: ${error.message}`,
        });
        clearAllResumableState();
        setTimeout(() => setNotification(null), 5000);
      });
  }, []);

  if (initialMessages === null) {
    return (
      <div className="relative h-full">
        {notification && (
          <div
            className={cn(
              "absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2 text-white shadow-lg",
              notification.type === "info" && "bg-blue-500",
            )}
          >
            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>{notification.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <ChatUI
      initialMessages={initialMessages}
      notification={notification}
      setNotification={setNotification}
    />
  );
}
