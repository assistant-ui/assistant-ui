"use client";

import {
  RetrievalChunks,
  type RetrievalChunk,
} from "@/components/assistant-ui/elements/retrieval-chunks";
import { defineStates } from "./types";

const QUERY = "how does draft restore work";
const CHUNKS: readonly RetrievalChunk[] = [
  {
    id: "c1",
    source: "migration-0.14.md",
    locator: "§ 2",
    score: 0.91,
    text: "The composer owns its draft from 0.14 onward. Parent state that mirrored the draft is no longer read and should be removed.",
  },
  {
    id: "c2",
    source: "composer.tsx",
    locator: "L12–31",
    score: 0.84,
    text: "useDraft(threadId) subscribes to the per-thread draft slot and clears it when the thread changes.",
  },
  {
    id: "c3",
    source: "CHANGELOG.md",
    locator: "0.14.0",
    score: 0.62,
    text: "fix(react-lexical): clear stale drafts on thread switch.",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "searching",
    label: "Retrieving",
    note: "The query is out and no passage has come back yet.",
    Component: () => (
      <RetrievalChunks
        query={QUERY}
        chunks={CHUNKS}
        visibleCount={0}
        searching
      />
    ),
  },
  {
    key: "partial",
    label: "Partial",
    note: "Two passages have landed while retrieval is still running.",
    Component: () => (
      <RetrievalChunks
        query={QUERY}
        chunks={CHUNKS}
        visibleCount={2}
        searching
      />
    ),
  },
  {
    key: "empty",
    label: "No passages",
    note: "Retrieval finished and nothing scored above the threshold.",
    Component: () => (
      <RetrievalChunks
        query="sqlite wal checkpoint interval"
        chunks={[]}
        visibleCount={0}
        searching={false}
      />
    ),
  },
  {
    key: "low-confidence",
    label: "Low scores",
    note: "Every passage scored below 0.80, so none is marked as a strong match.",
    Component: () => (
      <RetrievalChunks
        query="offline queue for unsent messages"
        chunks={[
          {
            id: "l1",
            source: "thread-runtime.md",
            locator: "§ 5",
            score: 0.58,
            text: "Messages sent while a run is active are appended once the run finishes.",
          },
          {
            id: "l2",
            source: "use-composer.ts",
            locator: "L40–52",
            score: 0.44,
            text: "send() is a no-op while the composer is empty or the thread is disabled.",
          },
        ]}
        visibleCount={2}
        searching={false}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long passages",
    note: "Long file names truncate and long passages clamp to two lines.",
    Component: () => (
      <RetrievalChunks
        query="how does the remote thread list adapter persist titles and archive state"
        chunks={[
          {
            id: "x1",
            source: "packages/react/src/runtimes/remote-thread-list/adapter.ts",
            locator: "L118–164",
            score: 0.88,
            text: "The adapter persists the title after the first assistant message completes, then writes archive and unarchive changes through the same update call so the list and the server never disagree about which threads are visible.",
          },
          {
            id: "x2",
            source: "docs/runtimes/custom/remote-thread-list-persistence.mdx",
            locator: "§ 3.2",
            score: 0.81,
            text: "Implement initialize, rename, archive, unarchive, and delete. Each method should resolve only after the backend confirms the write, since the runtime treats a resolved promise as the source of truth for the thread list.",
          },
        ]}
        visibleCount={2}
        searching={false}
      />
    ),
  },
]);
