import { useState } from "react";
import {
  ThreadSearch,
  type SearchableThread,
} from "@assistant-ui/ui/components/assistant-ui/elements/thread-search.tsx";
import { defineSections } from "../types";

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
    title: "Queue ordering trap when a direct enqueue overtakes a buffered one",
    group: "Earlier",
    preview: "Direct enqueue overtakes buffered",
  },
];

function ThreadSearchExample({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeId, setActiveId] = useState("2");
  return (
    <ThreadSearch
      threads={THREADS}
      query={query}
      activeId={activeId}
      onQueryChange={setQuery}
      onActiveChange={setActiveId}
    />
  );
}

export default defineSections([
  {
    id: "thread-search",
    title: "Thread search",
    category: "chat",
    notes: "thread-search.tsx (standalone): grouped threads with a pinned one.",
    render: () => <ThreadSearchExample />,
  },
  {
    id: "thread-search-filtered",
    title: "Thread search (filtered)",
    category: "chat",
    notes: 'Query "draft".',
    render: () => <ThreadSearchExample initialQuery="draft" />,
  },
]);
