"use client";

import { useState } from "react";
import {
  ThreadSearch,
  type SearchableThread,
} from "@/components/assistant-ui/elements/thread-search";

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

export function ThreadSearchDemo() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("2");
  const [openId, setOpenId] = useState("2");
  const openThread = THREADS.find((thread) => thread.id === openId);

  return (
    <div className="flex flex-col gap-3">
      <ThreadSearch
        threads={THREADS}
        query={query}
        activeId={activeId}
        onQueryChange={setQuery}
        onActiveChange={setActiveId}
        onSelect={setOpenId}
      />
      <p className="text-foreground/50 text-sm">
        Open thread: {openThread?.title}
      </p>
    </div>
  );
}
