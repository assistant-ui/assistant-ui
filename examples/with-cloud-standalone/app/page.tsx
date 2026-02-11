"use client";

import { useState } from "react";
import { useCloudChat } from "@assistant-ui/cloud-ai-sdk";
import { Thread } from "@/components/chat/Thread";
import { Composer } from "@/components/chat/Composer";
import { ThreadList } from "@/components/chat/ThreadList";

export default function Home() {
  // Zero-config mode: auto-initializes anonymous cloud from NEXT_PUBLIC_ASSISTANT_BASE_URL.
  // For custom configuration, pass options:
  //   - { cloud: myCloud } for authenticated users
  //   - { threads: useThreads(...) } for external thread management
  //   - { onSyncError: (err) => ... } for error handling
  const { messages, sendMessage, stop, status, threadStore } = useCloudChat();

  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const isRunning = status === "streaming" || status === "submitted";
  const isLoading = status === "submitted";

  const handleDelete = async (id: string) => {
    if (threadStore.threadId === id) threadStore.selectThread(null);
    await threadStore.delete(id);
  };

  return (
    <div className="flex h-full">
      <ThreadList
        threads={threadStore.threads}
        selectedId={threadStore.threadId}
        onSelect={threadStore.selectThread}
        onDelete={handleDelete}
        isLoading={threadStore.isLoading}
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
