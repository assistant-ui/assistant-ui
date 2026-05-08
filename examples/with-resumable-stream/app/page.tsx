"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  createResumableSessionStorage,
  useAISDKRuntime,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

const storage = createResumableSessionStorage();

function ChatRuntime() {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        resumable: {
          storage,
          resumeApi: (streamId) => `/api/chat/resume/${streamId}`,
        },
      }),
    [],
  );

  const chat = useChat({ transport });
  const runtime = useAISDKRuntime(chat);

  const resumedOnceRef = useRef(false);
  const resumeStream = chat.resumeStream;
  useEffect(() => {
    if (resumedOnceRef.current) return;
    if (!storage.getStreamId()) return;
    resumedOnceRef.current = true;
    resumeStream().catch((err: unknown) => {
      console.warn("[resumable] resume failed; clearing stale id", err);
      storage.clear();
    });
  }, [resumeStream]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function Home() {
  return <ChatRuntime />;
}
