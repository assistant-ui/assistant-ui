"use client";

import { LightThread } from "@/app/light-thread";
import {
  AuiProvider,
  Suggestions,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { Plus, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { InspirationRail } from "./InspirationRail";

const starterSuggestions = Suggestions([
  {
    title: "Shape a calm morning",
    label: "Turn a busy list into three clear priorities",
    prompt:
      "Help me turn a busy task list into three calm, realistic priorities for today.",
  },

  {
    title: "Generate a meeting summary",
    label: "The summary article is in PDF format.",
    prompt:
      "The meeting's roadside summaries were extracted and summarized into a PDF document.",
  },
  {
    title: "Learning and Explanation",
    label: "Explaining how to optimize memory",
    prompt:
      "This explains how to optimize memory in a simple and easy-to-understand way.",
  },
]);

function LightThreadList() {
  return (
    <ThreadListPrimitive.Root className="thread-list">
      <ThreadListPrimitive.New className="new-thread-button">
        <Plus size={16} />
        New thought
      </ThreadListPrimitive.New>

      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root className="thread-list-item">
            <ThreadListItemPrimitive.Trigger className="thread-list-trigger">
              <ThreadListItemPrimitive.Title fallback="New chat" />
            </ThreadListItemPrimitive.Trigger>
          </ThreadListItemPrimitive.Root>
        )}
      </ThreadListPrimitive.Items>
    </ThreadListPrimitive.Root>
  );
}

function Workspace() {
  const isEmpty = useAuiState((state) => state.thread.isEmpty);
  const threadMessages = useAuiState((state) => state.thread.messages);
  const messages = useMemo(
    () =>
      threadMessages
        .filter(
          (message) => message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({
          role: message.role,
          content: message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join(""),
        })),
    [threadMessages],
  );

  return (
    <main className="light-shell">
      <aside className="light-sidebar" aria-label="Light navigation">
        <div>
          <a className="brand-mark" href="#" aria-label="Light home">
            <span>Light</span>
          </a>

          <p className="sidebar-kicker">A quiet place to think</p>

          <LightThreadList />
        </div>

        <div className="sidebar-placeholder">
          <p className="section-label">Your threads</p>
        </div>
      </aside>

      <section className="conversation-panel">
        <header className="conversation-header">
          <div>
            <p className="eyebrow">{isEmpty ? "Fresh page" : "In progress"}</p>
            <h1>{isEmpty ? "Good morning." : "A lighter way forward."}</h1>
          </div>
        </header>

        <LightThread />
      </section>

      <InspirationRail messages={messages} />
    </main>
  );
}

export default function Home() {
  const aui = useAui({
    suggestions: starterSuggestions,
  });

  return (
    <AuiProvider value={aui}>
      <Workspace />
    </AuiProvider>
  );
}
