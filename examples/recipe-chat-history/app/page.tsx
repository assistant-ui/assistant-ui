"use client";

import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { threadListAdapter } from "./thread-list-adapter";

export default function Home() {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => useChatRuntime(),
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="grid h-dvh grid-rows-[minmax(0,30%)_minmax(0,1fr)] gap-4 p-4 md:grid-cols-[260px_1fr] md:grid-rows-1">
        <div className="min-h-0 overflow-y-auto">
          <ThreadList />
        </div>
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
}
