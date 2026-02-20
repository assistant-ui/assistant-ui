"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import Link from "next/link";

export default function Home() {
  // Using the new simplified useChatRuntime hook
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <div className="absolute top-3 right-3 z-10">
          <Link
            href="/internal/component-lab"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
          >
            Internal Component Lab
          </Link>
        </div>
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
