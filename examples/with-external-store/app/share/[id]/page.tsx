"use client";

import { use, useEffect, useState } from "react";
import { ThreadReadOnly } from "@assistant-ui/react";
import type { SerializedThreadMessage } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

type SharedThread = {
  id: string;
  messages: SerializedThreadMessage[];
  createdAt: string;
};

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [thread, setThread] = useState<SharedThread | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setThread(null);
    setError(null);

    fetch(`/api/share/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Thread not found");
        return res.json();
      })
      .then((nextThread) => {
        setThread(nextThread);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load thread");
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex h-dvh flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold text-lg">Shared Conversation</h1>
          <p className="text-muted-foreground text-sm">
            {thread.messages.length} messages &middot;{" "}
            {new Date(thread.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden [&_.aui-composer-root]:pointer-events-none [&_.aui-composer-root]:opacity-50 [&_.aui-thread-welcome-root]:hidden">
        <ThreadReadOnly messages={thread.messages}>
          <Thread />
        </ThreadReadOnly>
      </div>
    </main>
  );
}
