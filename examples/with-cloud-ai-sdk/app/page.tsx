"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { AssistantCloud } from "assistant-cloud";
import { useSync, useThreads } from "assistant-cloud/ai-sdk";
import { Thread } from "@/components/chat/Thread";
import { Composer } from "@/components/chat/Composer";
import { ThreadList } from "@/components/chat/ThreadList";

// Cloud auth - uses project-specific URL from environment
const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

export default function Home() {
  // AI SDK chat state - defaults to /api/chat
  const chat = useChat();

  // Thread list from cloud
  const threads = useThreads(cloud);

  // Cloud sync - persists messages, manages thread ID
  const [threadId, selectThread] = useSync(cloud, chat, {
    onThreadCreated: () => threads.refresh(),
  });

  // Local input state
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await chat.sendMessage({ parts: [{ type: "text", text }] });
  };

  const isRunning = chat.status === "streaming" || chat.status === "submitted";

  return (
    <div className="flex h-full">
      <ThreadList
        threads={threads.list}
        selectedId={threadId}
        onSelect={selectThread}
        onDelete={threads.delete}
        isLoading={threads.isLoading}
      />

      <div className="flex flex-1 flex-col">
        <Thread messages={chat.messages} isRunning={isRunning}>
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
