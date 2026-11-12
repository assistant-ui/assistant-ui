"use client";

import { SpeakerIdentity } from "@/components/assistant-ui/elements/speaker-identity";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "two-speakers",
    label: "Two speakers",
    note: "A plain user and agent exchange with no model detail.",
    Component: () => (
      <SpeakerIdentity
        turns={[
          {
            id: "1",
            kind: "user",
            name: "You",
            text: "Summarize the open issues tagged runtime.",
          },
          {
            id: "2",
            kind: "agent",
            name: "Assistant",
            text: "There are 14 open. Most are about remote thread list sync.",
          },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long turns",
    note: "Long names, details, and unbroken tool output wrap inside the column.",
    Component: () => (
      <SpeakerIdentity
        turns={[
          {
            id: "1",
            kind: "agent",
            name: "Release coordinator",
            detail: "opus · 3 workers",
            text: "Three packages changed since the last release. I asked one worker to draft changesets and another to check the peer dependency ranges before publishing.",
          },
          {
            id: "2",
            kind: "subagent",
            name: "changeset-writer",
            detail: "sonnet",
            text: "Wrote patch changesets for @assistant-ui/react, @assistant-ui/react-ai-sdk, and @assistant-ui/react-markdown.",
          },
          {
            id: "3",
            kind: "tool",
            name: "bash",
            detail: "2.4s",
            text: "pnpm changeset status --since=origin/main --output=/tmp/changeset-status-2026-11-03.json",
          },
        ]}
      />
    ),
  },
]);
