"use client";

import {
  CodeDiff,
  type DiffLine,
} from "@/components/assistant-ui/elements/code-diff";
import { defineStates } from "./types";

const NEW_FILE: DiffLine[] = [
  { kind: "added", text: 'import { useEffect, useState } from "react";' },
  { kind: "added", text: "" },
  { kind: "added", text: "export function useDraft(threadId: string) {" },
  { kind: "added", text: "  const key = `draft:${threadId}`;" },
  {
    kind: "added",
    text: '  const [draft, setDraft] = useState(() => localStorage.getItem(key) ?? "");',
  },
  {
    kind: "added",
    text: "  useEffect(() => localStorage.setItem(key, draft), [key, draft]);",
  },
  { kind: "added", text: "  return [draft, setDraft] as const;" },
  { kind: "added", text: "}" },
];

const DELETED_FILE: DiffLine[] = [
  { kind: "removed", text: "// Kept for the v0.9 composer API." },
  { kind: "removed", text: "export function useLegacyDraft() {" },
  { kind: "removed", text: '  return useState("");' },
  { kind: "removed", text: "}" },
];

const LONG_LINES: DiffLine[] = [
  {
    kind: "context",
    text: "export const runtime = useRemoteThreadListRuntime({",
  },
  {
    kind: "removed",
    text: '  runtimeHook: () => useChatRuntime({ api: "/api/chat", body: { model: "gpt-4o-mini" } }),',
  },
  {
    kind: "added",
    text: '  runtimeHook: () => useChatRuntime({ api: "/api/chat", body: { model: "claude-sonnet-4-5", system: SYSTEM_PROMPT, temperature: 0.2 } }),',
  },
  {
    kind: "added",
    text: '  adapter: new AssistantCloudThreadListAdapter({ cloud, onError: (error) => console.error("thread list sync failed", error) }),',
  },
  { kind: "context", text: "});" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "new-file",
    label: "New file",
    note: "A file created from scratch, so every line is an addition.",
    Component: () => (
      <CodeDiff
        filename="use-draft.ts"
        additions={8}
        deletions={0}
        lines={NEW_FILE}
        cycle={0}
      />
    ),
  },
  {
    key: "deleted-file",
    label: "Deleted file",
    note: "A file removed entirely, so every line is a removal.",
    Component: () => (
      <CodeDiff
        filename="use-legacy-draft.ts"
        additions={0}
        deletions={4}
        lines={DELETED_FILE}
        cycle={0}
      />
    ),
  },
  {
    key: "empty",
    label: "Empty",
    note: "A diff with no changed lines shows only the filename and zero counts.",
    Component: () => (
      <CodeDiff
        filename="use-draft.ts"
        additions={0}
        deletions={0}
        lines={[]}
        cycle={0}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long lines",
    note: "Lines wider than the card scroll sideways instead of wrapping.",
    Component: () => (
      <CodeDiff
        filename="apps/web/app/assistant/runtime-provider.tsx"
        additions={2}
        deletions={1}
        lines={LONG_LINES}
        cycle={0}
      />
    ),
  },
]);
