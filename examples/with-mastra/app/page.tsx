"use client";

import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Thread } from "@/components/assistant-ui/thread";
import { WorkflowPanel } from "@/components/workflow-panel";
import { AuiProvider, Suggestions, useAui } from "@assistant-ui/react";
import { DatabaseIcon, GitBranchIcon, SparklesIcon } from "lucide-react";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

function ChatSurface() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Draft release notes",
        label: "from a short change summary",
        prompt:
          "Draft concise release notes for a new Mastra integration with persistent threads and workflow approvals.",
      },
      {
        title: "Review rollout risk",
        label: "for a framework adapter",
        prompt:
          "Give me a practical rollout checklist for a new framework adapter package.",
      },
    ]),
  });

  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

function Workbench() {
  return (
    <main className="workbench">
      <aside className="thread-rail" aria-label="Mastra memory threads">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div>
            <strong>Mastra desk</strong>
            <span>assistant-ui example</span>
          </div>
        </div>
        <div className="rail-label">
          <DatabaseIcon className="size-3.5" />
          Persistent threads
        </div>
        <div className="thread-rail__list">
          <ThreadList />
        </div>
        <div className="rail-note">
          <span className="live-dot" />
          LibSQL memory
        </div>
      </aside>

      <section className="chat-stage" aria-label="Release assistant chat">
        <header className="chat-stage__header">
          <div>
            <p className="eyebrow">Release operations</p>
            <h1>Release Assistant</h1>
          </div>
          <div className="capability-list" aria-label="Enabled features">
            <span>
              <SparklesIcon className="size-3.5" /> AI SDK stream
            </span>
            <span>
              <GitBranchIcon className="size-3.5" /> Mastra memory
            </span>
          </div>
        </header>
        <div className="chat-stage__body">
          <ChatSurface />
        </div>
      </section>

      <WorkflowPanel />
    </main>
  );
}

export default function Home() {
  return (
    <MyRuntimeProvider>
      <Workbench />
    </MyRuntimeProvider>
  );
}
