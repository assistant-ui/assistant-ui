"use client";

import {
  ThreadSearch,
  type SearchableThread,
} from "@/components/assistant-ui/elements/thread-search";
import { defineStates } from "./types";

const noop = () => {};

const THREADS: readonly SearchableThread[] = [
  {
    id: "1",
    title: "Draft restore across threads",
    group: "Today",
    preview: "Clearing the slot on switch",
    pinned: true,
  },
  {
    id: "2",
    title: "Converter drops empty parts",
    group: "Today",
    preview: "Guard added, tests green",
  },
  {
    id: "3",
    title: "Elements gap analysis",
    group: "Yesterday",
    preview: "63 candidates, graded",
  },
  {
    id: "4",
    title: "Queue ordering trap",
    group: "Earlier",
    preview: "Direct enqueue overtakes buffered",
  },
];

const handlers = { onQueryChange: noop, onActiveChange: noop, onSelect: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filtered",
    label: "Filtered",
    note: "A query narrows the list to the threads that mention it.",
    Component: () => (
      <ThreadSearch
        threads={THREADS}
        query="draft"
        activeId="1"
        {...handlers}
      />
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "The query matches no thread title or preview.",
    Component: () => (
      <ThreadSearch
        threads={THREADS}
        query="billing webhook"
        activeId="2"
        {...handlers}
      />
    ),
  },
  {
    key: "empty",
    label: "No threads",
    note: "The user has no threads yet, so every query comes back empty.",
    Component: () => (
      <ThreadSearch threads={[]} query="" activeId="" {...handlers} />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a select handler rows render as static options.",
    Component: () => <ThreadSearch threads={THREADS} query="" activeId="3" />,
  },
  {
    key: "long-content",
    label: "Long titles",
    note: "Long titles and previews truncate to one line each.",
    Component: () => (
      <ThreadSearch
        threads={[
          {
            id: "1",
            title:
              "Draft restore across threads after a reload on remote thread lists",
            group: "Today",
            preview:
              "Keying the slot by the remote id once it resolves fixes the cause, and a regression test covers it",
            pinned: true,
          },
          {
            id: "2",
            title:
              "Why the converter drops tool calls with an empty args object in streaming mode",
            group: "Today",
            preview:
              "Guard added for empty parts, snapshot tests updated, CI green on all three runtimes",
          },
        ]}
        query=""
        activeId="2"
        {...handlers}
      />
    ),
  },
]);
