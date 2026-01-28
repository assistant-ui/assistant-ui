"use client";

/**
 * Example: Lightweight AI SDK + Cloud integration
 *
 * This example demonstrates the lightweight hooks from `assistant-cloud/ai-sdk`.
 * Use this approach when building completely custom UIs without assistant-ui components.
 *
 * For the full assistant-ui experience with optimistic updates and integrated
 * thread management, use `useChatRuntime` from `@assistant-ui/react-ai-sdk`:
 *
 * ```tsx
 * import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
 * import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
 *
 * const runtime = useChatRuntime({ cloud, api: "/api/chat" });
 * return (
 *   <AssistantRuntimeProvider runtime={runtime}>
 *     <Thread />
 *   </AssistantRuntimeProvider>
 * );
 * ```
 */

import { useState } from "react";
import { AssistantCloud } from "assistant-cloud";
import { useCloudChat, useThreads } from "assistant-cloud/ai-sdk";
import { Thread } from "@/components/chat/Thread";
import { Composer } from "@/components/chat/Composer";
import { ThreadList } from "@/components/chat/ThreadList";

// Cloud auth - uses project-specific URL from environment
const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

export default function Home() {
  const threads = useThreads(cloud);

  const chat = useCloudChat(cloud, {
    api: "/api/chat",
    onThreadCreated: () => threads.refresh(),
    onTitleGenerated: (threadId: string, title: string) =>
      threads.rename(threadId, title),
  });

  // Local input state (manual since we're not using assistant-ui primitives)
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await chat.sendMessage({ parts: [{ type: "text", text }] });
  };

  const isRunning = chat.status === "streaming" || chat.status === "submitted";
  const isLoading = chat.status === "submitted";

  return (
    <div className="flex h-full">
      <ThreadList
        threads={threads.threads}
        selectedId={chat.threadId}
        onSelect={chat.selectThread}
        onDelete={threads.delete}
        isLoading={threads.isLoading}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Thread messages={chat.messages} isLoading={isLoading}>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isRunning={isRunning}
            onCancel={chat.stop}
          />
        </Thread>
      </div>
    </div>
  );
}
