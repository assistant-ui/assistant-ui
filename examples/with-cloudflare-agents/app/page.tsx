"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useCloudflareAgentRuntime } from "@assistant-ui/react-cloudflare-agents";

export default function Home() {
  // Connect to the Cloudflare Worker running on port 8787 (wrangler dev)
  const runtime = useCloudflareAgentRuntime("chat", {
    host: "http://localhost:8787",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
