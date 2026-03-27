"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { useState } from "react";
import {
  useAui,
  AuiProvider,
  Suggestions,
  ThreadPrimitive,
} from "@assistant-ui/react";

function ShareButton() {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {shareUrl && (
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 text-xs underline"
        >
          Open shared link
        </a>
      )}
      <ThreadPrimitive.Share
        onShare={async (messages) => {
          const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
          });
          if (!res.ok) return;
          const { id } = await res.json();
          if (!id) return;
          const url = `${window.location.origin}/share/${id}`;
          await navigator.clipboard.writeText(url);
          setShareUrl(url);
        }}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
      >
        Share
      </ThreadPrimitive.Share>
    </div>
  );
}

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Send a test message",
        label: "to see the external store in action",
        prompt: "Hello! How does the external store work?",
      },
      {
        title: "Tell me a story",
        label: "to generate multiple messages",
        prompt: "Tell me a short story about a robot learning to paint.",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h1 className="font-semibold text-sm">External Store Example</h1>
          <ShareButton />
        </div>
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="h-dvh">
      <ThreadWithSuggestions />
    </main>
  );
}
