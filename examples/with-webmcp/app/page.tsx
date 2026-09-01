"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  unstable_defaultWebMcpFilter,
  unstable_useWebMcpProvider,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import toolkit from "./toolkit";
import { TaskPanel } from "./task-panel";

// clear_completed_tasks is left out because it deletes data, and a published
// tool runs with the approval step out of the loop.
const WEBMCP_TOOLS = new Set(["add_task", "list_tasks"]);

const WebMcpStatus = () => {
  const { status, registeredToolNames } = unstable_useWebMcpProvider({
    filter: (name, tool) =>
      unstable_defaultWebMcpFilter(name, tool) && WEBMCP_TOOLS.has(name),
  });

  return (
    <p className="text-muted-foreground text-xs">
      {status === "unsupported"
        ? "WebMCP not detected in this browser — the tools stay chat-only."
        : registeredToolNames.length === 0
          ? "WebMCP detected — no tools published yet."
          : `Exposed to your browser agent: ${registeredToolNames.join(", ")}`}
    </p>
  );
};

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Add a task",
        label: "to the list",
        prompt: "Add a task: water the plants",
      },
      {
        title: "What's on my list?",
        label: "read the tasks",
        prompt: "What tasks are on my list?",
      },
      {
        title: "Clear completed",
        label: "with approval",
        prompt: "Clear my completed tasks.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-1">
        <aside className="border-border flex flex-col gap-4 border-b p-4 md:border-r md:border-b-0">
          <TaskPanel />
          <WebMcpStatus />
        </aside>
        <main className="h-full min-w-0">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
