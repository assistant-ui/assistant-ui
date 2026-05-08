"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  createResumableSessionStorage,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

const storage = createResumableSessionStorage();

export default function Home() {
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

  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
