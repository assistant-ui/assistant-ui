"use client";

import {
  ReviewableDiff,
  type DiffHunk,
  type HunkDecision,
} from "@/components/assistant-ui/elements/reviewable-diff";
import { defineStates } from "./types";

const noop = () => {};

const HUNKS: readonly DiffHunk[] = [
  {
    id: "h1",
    range: "@@ -12,6 +12,7",
    decision: "pending",
    lines: [
      { kind: "context", text: "  const composer = useComposer();" },
      { kind: "removed", text: '  const [draft, setDraft] = useState("");' },
      { kind: "added", text: "  const draft = useDraft(threadId);" },
    ],
  },
  {
    id: "h2",
    range: "@@ -31,4 +32,5",
    decision: "pending",
    lines: [
      { kind: "context", text: "  useEffect(() => {" },
      { kind: "added", text: "    if (!threadId) return;" },
      { kind: "context", text: "    hydrate(draft);" },
    ],
  },
  {
    id: "h3",
    range: "@@ -58,3 +60,3",
    decision: "pending",
    lines: [
      { kind: "removed", text: "  return <form onSubmit={send}>" },
      { kind: "added", text: "  return <form onSubmit={composer.send}>" },
    ],
  },
];

const withDecisions = (...decisions: HunkDecision[]) =>
  HUNKS.map((hunk, i) => ({ ...hunk, decision: decisions[i] ?? "pending" }));

const handlers = { onKeep: noop, onDiscard: noop, onApply: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "partial",
    label: "In review",
    note: "One hunk kept, one discarded, and one still waiting, so Apply stays disabled.",
    Component: () => (
      <ReviewableDiff
        filename="composer.tsx"
        hunks={withDecisions("kept", "discarded", "pending")}
        {...handlers}
      />
    ),
  },
  {
    key: "ready",
    label: "Ready to apply",
    note: "Every hunk has a decision, so Apply is enabled for the kept ones.",
    Component: () => (
      <ReviewableDiff
        filename="composer.tsx"
        hunks={withDecisions("kept", "discarded", "kept")}
        {...handlers}
      />
    ),
  },
  {
    key: "all-discarded",
    label: "All discarded",
    note: "The user rejected every hunk, so Apply would change nothing.",
    Component: () => (
      <ReviewableDiff
        filename="composer.tsx"
        hunks={withDecisions("discarded", "discarded", "discarded")}
        {...handlers}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without handlers the hunks show their decisions and no buttons.",
    Component: () => (
      <ReviewableDiff
        filename="composer.tsx"
        hunks={withDecisions("kept", "kept", "discarded")}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long lines",
    note: "A long path and lines wider than the card scroll inside each hunk.",
    Component: () => (
      <ReviewableDiff
        filename="packages/react/src/runtimes/remote-thread-list/RemoteThreadListThreadListRuntimeCore.tsx"
        hunks={[
          {
            id: "l1",
            range: "@@ -204,9 +204,14",
            decision: "pending",
            lines: [
              {
                kind: "context",
                text: "  public async switchToThread(threadIdOrRemoteId: string): Promise<void> {",
              },
              {
                kind: "removed",
                text: "    const data = this._state.value.threadData[threadIdOrRemoteId];",
              },
              {
                kind: "added",
                text: "    const data = this._state.value.threadData[threadIdOrRemoteId] ?? this._resolveByRemoteId(threadIdOrRemoteId);",
              },
              {
                kind: "added",
                text: "    if (!data) throw new Error(`Thread ${threadIdOrRemoteId} is not in the list and could not be loaded from the adapter`);",
              },
            ],
          },
        ]}
        {...handlers}
      />
    ),
  },
]);
