"use client";

import { useState } from "react";
import { useCloudChat } from "assistant-cloud/ai-sdk";
import { Thread } from "@/components/chat/Thread";
import { Composer } from "@/components/chat/Composer";
import { ThreadList } from "@/components/chat/ThreadList";

export default function Home() {
  // That's it! No cloud instance, no useThreads call needed.
  // Just set NEXT_PUBLIC_ASSISTANT_BASE_URL env var.
  const { messages, sendMessage, stop, status, threads } = useCloudChat();

  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage({ parts: [{ type: "text", text }] });
  };

  const isRunning = status === "streaming" || status === "submitted";
  const isLoading = status === "submitted";

  return (
    <div className="flex h-full">
      <ThreadList
        threads={threads.threads}
        selectedId={threads.threadId}
        onSelect={threads.selectThread}
        onDelete={threads.delete}
        isLoading={threads.isLoading}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Thread messages={messages} isLoading={isLoading}>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isRunning={isRunning}
            onCancel={stop}
          />
        </Thread>
      </div>
    </div>
  );
}
