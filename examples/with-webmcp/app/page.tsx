"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { TaskBoard } from "@/components/task-board";
import { WebMcpApprovalDialog } from "@/components/webmcp-approval-dialog";
import { WebMcpStatus } from "@/components/webmcp-status";
import toolkit from "./toolkit";

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Add a task",
        label: "to the board",
        prompt: "Add a task: write the WebMCP demo script",
      },
      {
        title: "What's on the board?",
        label: "list all tasks",
        prompt: "List the tasks on the board and summarize what's left to do.",
      },
      {
        title: "Finish a task",
        label: "mark one done",
        prompt: "Mark the first open task on the board as done.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <WebMcpApprovalDialog />
      <div className="flex h-full flex-col">
        <header className="flex flex-col gap-1 border-b px-4 py-3">
          <h1 className="text-sm font-semibold">
            assistant-ui × WebMCP task board
          </h1>
          <WebMcpStatus />
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_20rem]">
          <main className="min-h-0">
            <Thread />
          </main>
          <aside className="overflow-y-auto border-t p-4 md:border-t-0 md:border-l">
            <TaskBoard />
          </aside>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
