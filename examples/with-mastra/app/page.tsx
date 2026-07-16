"use client";

import { ThreadList } from "@/components/assistant-ui/thread-list";
import { Thread } from "@/components/assistant-ui/thread";
import { WorkflowPanel } from "@/components/workflow-panel";
import { AuiProvider, Suggestions, useAui } from "@assistant-ui/react";
import {
  DatabaseIcon,
  FileTextIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type MastraExampleAgentId,
  MyRuntimeProvider,
} from "./MyRuntimeProvider";

const agents = {
  releaseAssistant: {
    name: "Release Assistant",
    eyebrow: "Release communications",
    icon: FileTextIcon,
    suggestions: [
      {
        title: "Draft release notes",
        label: "with the release brief tool",
        prompt:
          "Use the draft release brief tool for a new Mastra integration aimed at developers, then write concise release notes.",
      },
      {
        title: "Write an announcement",
        label: "for persisted threads",
        prompt:
          "Use the draft release brief tool to structure an end-user announcement for persisted conversation threads.",
      },
    ],
  },
  riskAnalyst: {
    name: "Risk Analyst",
    eyebrow: "Rollout assurance",
    icon: ShieldCheckIcon,
    suggestions: [
      {
        title: "Assess rollout risk",
        label: "for a persistence change",
        prompt:
          "Use the rollout risk tool to assess a persistence migration with no tested rollback path.",
      },
      {
        title: "Define release gates",
        label: "for a reversible UI change",
        prompt:
          "Use the rollout risk tool to define release gates for a UI-only change with a tested rollback.",
      },
    ],
  },
} as const;

const agentStorageKey = "assistant-ui-mastra-agent-id";
const agentIds: readonly MastraExampleAgentId[] = [
  "releaseAssistant",
  "riskAnalyst",
];

const isAgentId = (value: string | null): value is MastraExampleAgentId =>
  value === "releaseAssistant" || value === "riskAnalyst";

function ChatSurface({ agentId }: { agentId: MastraExampleAgentId }) {
  const aui = useAui({
    suggestions: Suggestions([...agents[agentId].suggestions]),
  });

  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

function AgentSelector({
  agentId,
  onAgentChange,
}: {
  agentId: MastraExampleAgentId;
  onAgentChange: (agentId: MastraExampleAgentId) => void;
}) {
  return (
    <div className="agent-selector" role="tablist" aria-label="Mastra agent">
      {agentIds.map((id) => {
        const agent = agents[id];
        const Icon = agent.icon;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={agentId === id}
            onClick={() => onAgentChange(id)}
          >
            <Icon className="size-3.5" />
            {agent.name}
          </button>
        );
      })}
    </div>
  );
}

function Workbench({
  agentId,
  onAgentChange,
}: {
  agentId: MastraExampleAgentId;
  onAgentChange: (agentId: MastraExampleAgentId) => void;
}) {
  const agent = agents[agentId];

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

      <section className="chat-stage" aria-label={`${agent.name} chat`}>
        <header className="chat-stage__header">
          <div>
            <p className="eyebrow">{agent.eyebrow}</p>
            <h1>{agent.name}</h1>
          </div>
          <AgentSelector agentId={agentId} onAgentChange={onAgentChange} />
          <div className="capability-list" aria-label="Enabled features">
            <span>
              <SparklesIcon className="size-3.5" /> AI SDK stream
            </span>
            <span>
              <GitBranchIcon className="size-3.5" /> Mastra memory
            </span>
            <span>
              <WrenchIcon className="size-3.5" /> Typed tools
            </span>
          </div>
        </header>
        <div className="chat-stage__body">
          <ChatSurface agentId={agentId} />
        </div>
      </section>

      <WorkflowPanel />
    </main>
  );
}

export default function Home() {
  const [agentId, setAgentId] =
    useState<MastraExampleAgentId>("releaseAssistant");
  useEffect(() => {
    const stored = window.localStorage.getItem(agentStorageKey);
    if (isAgentId(stored)) setAgentId(stored);
  }, []);
  const handleAgentChange = useCallback((nextAgentId: MastraExampleAgentId) => {
    setAgentId(nextAgentId);
    window.localStorage.setItem(agentStorageKey, nextAgentId);
  }, []);

  return (
    <MyRuntimeProvider agentId={agentId}>
      <Workbench agentId={agentId} onAgentChange={handleAgentChange} />
    </MyRuntimeProvider>
  );
}
