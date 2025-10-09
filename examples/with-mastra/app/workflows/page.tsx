"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";

export default function WorkflowsPage() {
  const runtime = useMastraRuntime({
    agentId: "chef-agent",
    workflows: ["cooking-workflow"],
    enableWorkflows: true,
  });

  return (
    <div className="flex h-full">
      <ThreadList />
      <div className="flex-1">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}